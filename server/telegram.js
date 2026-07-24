import { config } from "./config.js";
import { query } from "./db.js";

const TELEGRAM_API = "https://api.telegram.org";
const RETRY_LIMIT = 5;
let draining = false;

const escapeHtml = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

const normalizeUsername = (value) => String(value || "").replace(/^@/, "").toLowerCase();
const isAllowedUsername = (value) => normalizeUsername(value) === config.telegramAdminUsername;

const telegramRequest = async (method, payload) => {
  if (!config.telegramBotToken) throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  const response = await fetch(`${TELEGRAM_API}/bot${config.telegramBotToken}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(12_000)
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.ok) {
    throw new Error(result?.description || `Telegram API ${response.status}`);
  }
  return result.result;
};

const statusLabel = {
  new: "🟡 Новая",
  processed: "✅ Обработана",
  deleted: "🗑 Удалена"
};

const orderText = (order) => {
  const comment = order.comment || "Без комментария";
  return [
    `<b>Заявка №${order.id}</b>`,
    "",
    `<b>Статус:</b> ${statusLabel[order.status] || order.status}`,
    `<b>Имя:</b> ${escapeHtml(order.name)}`,
    `<b>Телефон:</b> <code>${escapeHtml(order.phone)}</code>`,
    `<b>Комментарий:</b> ${escapeHtml(comment)}`,
    "",
    `<b>Конфигурация:</b>`,
    escapeHtml(order.configuration),
    "",
    `<i>${new Date(order.created_at).toLocaleString("ru-RU", { timeZone: "Asia/Tashkent" })}</i>`
  ].join("\n");
};

const orderKeyboard = (orderId, status = "new") => ({
  inline_keyboard: status === "new"
    ? [
        [{ text: "☎️ Позвонить", callback_data: `call:${orderId}` }],
        [
          { text: "✅ Отметить как обработано", callback_data: `done:${orderId}` },
          { text: "🗑 Удалить", callback_data: `delete:${orderId}` }
        ]
      ]
    : [[{ text: "☎️ Позвонить", callback_data: `call:${orderId}` }]]
});

const loadOrder = async (id) => {
  const result = await query("SELECT * FROM orders WHERE id = $1", [id]);
  return result.rows[0] || null;
};

const activeAdmins = async () => {
  const result = await query(
    "SELECT chat_id, username, display_name FROM bot_admins WHERE active = TRUE ORDER BY created_at ASC"
  );
  return result.rows;
};

export const notifyOrder = async (orderOrId) => {
  const id = typeof orderOrId === "object" ? orderOrId.id : orderOrId;
  const claim = await query(
    `UPDATE orders
       SET telegram_status = 'sending',
           telegram_attempts = telegram_attempts + 1,
           telegram_last_attempt_at = NOW(),
           telegram_error = NULL
     WHERE id = $1
       AND status = 'new'
       AND (
         telegram_status IN ('pending', 'failed')
         OR (telegram_status = 'sending' AND telegram_last_attempt_at < NOW() - INTERVAL '10 minutes')
       )
       AND telegram_attempts < $2
     RETURNING *`,
    [id, RETRY_LIMIT]
  );
  const order = claim.rows[0];
  if (!order) return false;

  try {
    const admins = await activeAdmins();
    if (!admins.length) throw new Error(`Send /start to the bot from @${config.telegramAdminUsername}`);
    let firstMessageId = null;
    for (const admin of admins) {
      const message = await telegramRequest("sendMessage", {
        chat_id: admin.chat_id,
        text: orderText(order),
        parse_mode: "HTML",
        reply_markup: orderKeyboard(order.id, order.status)
      });
      firstMessageId ||= message.message_id;
    }
    await query(
      `UPDATE orders
          SET telegram_status = 'sent',
              telegram_message_id = $2,
              telegram_sent_at = NOW(),
              telegram_error = NULL
        WHERE id = $1`,
      [order.id, firstMessageId]
    );
    return true;
  } catch (error) {
    await query(
      `UPDATE orders
          SET telegram_status = 'failed',
              telegram_error = $2
        WHERE id = $1`,
      [order.id, String(error.message || error).slice(0, 800)]
    );
    console.error(`[telegram] order ${order.id} notification failed:`, error.message);
    return false;
  }
};

export const drainPendingNotifications = async () => {
  if (draining || !config.telegramBotToken) return;
  draining = true;
  try {
    const result = await query(
      `SELECT id
         FROM orders
        WHERE status = 'new'
          AND (
            telegram_status IN ('pending', 'failed')
            OR (telegram_status = 'sending' AND telegram_last_attempt_at < NOW() - INTERVAL '10 minutes')
          )
          AND telegram_attempts < $1
        ORDER BY created_at ASC
        LIMIT 20`,
      [RETRY_LIMIT]
    );
    for (const order of result.rows) await notifyOrder(order.id);
  } catch (error) {
    console.error("[telegram] notification queue error:", error.message);
  } finally {
    draining = false;
  }
};

const answerCallback = (callbackQueryId, text, showAlert = false) => telegramRequest("answerCallbackQuery", {
  callback_query_id: callbackQueryId,
  text,
  show_alert: showAlert
});

const editOrderMessage = async (callback, order) => {
  if (!callback.message) return;
  await telegramRequest("editMessageText", {
    chat_id: callback.message.chat.id,
    message_id: callback.message.message_id,
    text: orderText(order),
    parse_mode: "HTML",
    reply_markup: orderKeyboard(order.id, order.status)
  });
};

const handleCallback = async (callback) => {
  if (!isAllowedUsername(callback.from?.username)) {
    await answerCallback(callback.id, "Нет доступа.", true);
    return;
  }
  const [action, rawId] = String(callback.data || "").split(":");
  const id = Number.parseInt(rawId, 10);
  if (!Number.isSafeInteger(id)) {
    await answerCallback(callback.id, "Некорректная заявка.", true);
    return;
  }
  const order = await loadOrder(id);
  if (!order) {
    await answerCallback(callback.id, "Заявка не найдена.", true);
    return;
  }

  if (action === "call") {
    await answerCallback(callback.id, "Отправляю контакт клиента.");
    await telegramRequest("sendContact", {
      chat_id: callback.message.chat.id,
      phone_number: order.phone,
      first_name: order.name
    });
    return;
  }

  if (action === "done") {
    await query(
      `UPDATE orders
          SET status = 'processed', processed_at = COALESCE(processed_at, NOW())
        WHERE id = $1 AND status <> 'deleted'`,
      [id]
    );
    await answerCallback(callback.id, "Заявка отмечена как обработанная.");
    await editOrderMessage(callback, await loadOrder(id));
    return;
  }

  if (action === "delete") {
    await query(
      `UPDATE orders
          SET status = 'deleted', deleted_at = COALESCE(deleted_at, NOW())
        WHERE id = $1`,
      [id]
    );
    await answerCallback(callback.id, "Заявка удалена.");
    if (callback.message) {
      await telegramRequest("deleteMessage", {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id
      }).catch(() => editOrderMessage(callback, { ...order, status: "deleted" }));
    }
    return;
  }

  await answerCallback(callback.id, "Неизвестное действие.", true);
};

const handleStart = async (message) => {
  const username = message.from?.username;
  if (!isAllowedUsername(username)) {
    await telegramRequest("sendMessage", {
      chat_id: message.chat.id,
      text: "Этот бот принимает заявки только для команды MDR."
    });
    return;
  }
  const displayName = [message.from?.first_name, message.from?.last_name].filter(Boolean).join(" ")
    || config.telegramAdminDisplayName;
  await query(
    `INSERT INTO bot_admins (chat_id, username, display_name, active)
     VALUES ($1, $2, $3, TRUE)
     ON CONFLICT (chat_id)
     DO UPDATE SET username = EXCLUDED.username, display_name = EXCLUDED.display_name, active = TRUE`,
    [message.chat.id, normalizeUsername(username), displayName]
  );
  await query(
    `UPDATE orders
        SET telegram_status = 'pending',
            telegram_attempts = 0,
            telegram_error = NULL
      WHERE status = 'new'
        AND telegram_status = 'failed'
        AND telegram_error ILIKE '%/start%'`
  );
  await telegramRequest("sendMessage", {
    chat_id: message.chat.id,
    text: [
      `Готово, ${escapeHtml(config.telegramAdminDisplayName)}.`,
      "",
      "Новые заявки MDR будут приходить сюда.",
      "Кнопки под заявкой позволяют отправить контакт, отметить её обработанной или удалить."
    ].join("\n"),
    parse_mode: "HTML"
  });
  void drainPendingNotifications();
};

const handleHelp = async (message) => {
  if (!isAllowedUsername(message.from?.username)) {
    await telegramRequest("sendMessage", {
      chat_id: message.chat.id,
      text: "Оставить заявку на MDR можно в конфигураторе сайта. Для прямой связи: +998 91 001 81 72."
    });
    return;
  }
  await telegramRequest("sendMessage", {
    chat_id: message.chat.id,
    text: [
      "<b>MDR · управление заявками</b>",
      "",
      "/orders — последние необработанные заявки",
      "/start — повторно привязать этот чат",
      "/help — показать эту справку",
      "",
      "Под каждой заявкой доступны контакт клиента, обработка и удаление."
    ].join("\n"),
    parse_mode: "HTML"
  });
};

const handleOrders = async (message) => {
  if (!isAllowedUsername(message.from?.username)) {
    await telegramRequest("sendMessage", { chat_id: message.chat.id, text: "Нет доступа." });
    return;
  }
  const result = await query(
    `SELECT *
       FROM orders
      WHERE status = 'new'
      ORDER BY created_at DESC
      LIMIT 10`
  );
  if (!result.rows.length) {
    await telegramRequest("sendMessage", {
      chat_id: message.chat.id,
      text: "Новых необработанных заявок сейчас нет."
    });
    return;
  }
  for (const order of result.rows) {
    await telegramRequest("sendMessage", {
      chat_id: message.chat.id,
      text: orderText(order),
      parse_mode: "HTML",
      reply_markup: orderKeyboard(order.id, order.status)
    });
  }
};

export const handleTelegramUpdate = async (update) => {
  if (update.callback_query) return handleCallback(update.callback_query);
  const message = update.message;
  const command = message?.text?.trim().toLowerCase().split(/\s+/)[0]?.split("@")[0];
  if (command === "/start") return handleStart(message);
  if (command === "/help") return handleHelp(message);
  if (command === "/orders") return handleOrders(message);
  return null;
};

export const configureTelegramWebhook = async () => {
  if (!config.telegramBotToken) throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  if (!config.publicBaseUrl) throw new Error("PUBLIC_BASE_URL or RENDER_EXTERNAL_URL is not configured");
  if (!/^[A-Za-z0-9_-]{1,256}$/.test(config.telegramWebhookSecret)) {
    throw new Error("TELEGRAM_WEBHOOK_SECRET must contain only A-Z, a-z, 0-9, _ or -");
  }
  const webhook = await telegramRequest("setWebhook", {
    url: `${config.publicBaseUrl}/api/telegram/webhook`,
    secret_token: config.telegramWebhookSecret,
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: false
  });
  await Promise.all([
    telegramRequest("setMyCommands", {
      commands: [
        { command: "start", description: "Подключить уведомления MDR" },
        { command: "orders", description: "Показать новые заявки" },
        { command: "help", description: "Справка по управлению" }
      ]
    }),
    telegramRequest("setMyDescription", {
      description: "Официальный бот MDR Drone Studio. Получает заявки с сайта и помогает владельцу обрабатывать заказы."
    }),
    telegramRequest("setMyShortDescription", {
      short_description: "Заявки и консультации MDR Drone Studio."
    })
  ]);
  return webhook;
};
