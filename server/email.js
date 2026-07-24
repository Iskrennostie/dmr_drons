import { config } from "./config.js";
import { query } from "./db.js";

const escapeHtml = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const orderHtml = (order) => `
<!doctype html>
<html lang="ru">
  <body style="margin:0;background:#070a0c;color:#ecf3f2;font-family:Arial,sans-serif">
    <div style="max-width:680px;margin:0 auto;padding:42px 24px">
      <div style="border:1px solid #283438;background:#101619;padding:32px">
        <p style="margin:0 0 20px;color:#8fd5dd;font-size:11px;letter-spacing:2px;text-transform:uppercase">MDR / новая заявка</p>
        <h1 style="margin:0 0 28px;font-size:34px;line-height:1">Заявка №${escapeHtml(order.id)}</h1>
        <table role="presentation" style="width:100%;border-collapse:collapse;color:#ecf3f2">
          <tr><td style="padding:13px 0;border-top:1px solid #283438;color:#879397">Имя</td><td style="padding:13px 0;border-top:1px solid #283438;text-align:right;font-weight:bold">${escapeHtml(order.name)}</td></tr>
          <tr><td style="padding:13px 0;border-top:1px solid #283438;color:#879397">Телефон</td><td style="padding:13px 0;border-top:1px solid #283438;text-align:right"><a href="tel:${escapeHtml(order.phone)}" style="color:#8fd5dd">${escapeHtml(order.phone)}</a></td></tr>
          <tr><td style="padding:13px 0;border-top:1px solid #283438;color:#879397">Конфигурация</td><td style="padding:13px 0;border-top:1px solid #283438;text-align:right">${escapeHtml(order.configuration)}</td></tr>
        </table>
        <div style="margin-top:24px;padding:20px;background:#0b1012;color:#b5c0c2;line-height:1.65">
          <strong style="display:block;margin-bottom:8px;color:#ecf3f2">Комментарий</strong>
          ${escapeHtml(order.comment || "Без комментария")}
        </div>
        <p style="margin:24px 0 0;color:#697579;font-size:12px">Заявка сохранена в закрытой админке MDR. Даже если письмо задержится, запись останется в базе.</p>
      </div>
    </div>
  </body>
</html>`;

const sendWithResend = async (order) => {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${config.resendApiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      from: config.orderEmailFrom,
      to: [config.orderNotificationEmail],
      subject: `MDR — новая заявка №${order.id} от ${order.name}`,
      html: orderHtml(order)
    })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.message || `Email provider returned ${response.status}`);
  }
  return result.id || null;
};

export const drainPendingEmails = async () => {
  if (!config.resendApiKey || !config.orderNotificationEmail) return;

  for (let index = 0; index < 5; index += 1) {
    const claimed = await query(
      `UPDATE orders
          SET email_status = 'sending',
              email_attempts = email_attempts + 1,
              email_last_attempt_at = NOW(),
              email_error = NULL
        WHERE id = (
          SELECT id
            FROM orders
           WHERE status = 'new'
             AND email_status IN ('pending', 'failed')
             AND email_attempts < 5
           ORDER BY created_at ASC
           FOR UPDATE SKIP LOCKED
           LIMIT 1
        )
        RETURNING *`
    );
    const order = claimed.rows[0];
    if (!order) break;

    try {
      const providerId = await sendWithResend(order);
      await query(
        `UPDATE orders
            SET email_status = 'sent',
                email_provider_id = $2,
                email_sent_at = NOW(),
                email_error = NULL
          WHERE id = $1`,
        [order.id, providerId]
      );
    } catch (error) {
      await query(
        `UPDATE orders
            SET email_status = 'failed',
                email_error = $2
          WHERE id = $1`,
        [order.id, String(error.message || error).slice(0, 1000)]
      );
      console.error(`[email] order ${order.id}:`, error.message);
    }
  }
};

export const notifyOrderByEmail = async (orderId) => {
  if (!config.resendApiKey || !config.orderNotificationEmail) {
    await query(
      `UPDATE orders SET email_status = 'unconfigured' WHERE id = $1`,
      [orderId]
    );
    return;
  }
  await query(
    `UPDATE orders
        SET email_status = 'pending',
            email_error = NULL
      WHERE id = $1`,
    [orderId]
  );
  await drainPendingEmails();
};
