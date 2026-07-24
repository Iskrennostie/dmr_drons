import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { query } from "../db.js";
import { notifyOrderByEmail } from "../email.js";
import { notifyOrder } from "../telegram.js";
import { validateOrder } from "../validation.js";

export const ordersRouter = Router();

const orderLimit = rateLimit({
  windowMs: 15 * 60 * 1_000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { ok: false, error: "Слишком много попыток. Подождите несколько минут или позвоните нам." }
});

ordersRouter.post("/", orderLimit, async (request, response, next) => {
  try {
    const validated = validateOrder(request.body);
    if (!validated.ok) {
      return response.status(422).json({
        ok: false,
        error: "Проверьте заполненные поля.",
        fields: validated.errors
      });
    }
    const {
      name,
      phone,
      email,
      address,
      comment,
      configuration,
      sourceUrl,
      orderType,
      productId,
      productName,
      colorName,
      packageName,
      selectedOptions,
      totalPrice,
      clientRequestId
    } = validated.data;

    if (clientRequestId) {
      const existing = await query(
        "SELECT * FROM orders WHERE client_request_id = $1 LIMIT 1",
        [clientRequestId]
      );
      if (existing.rows[0]) {
        const order = existing.rows[0];
        return response.status(200).json({
          ok: true,
          duplicate: true,
          order: { id: order.id, status: order.status, createdAt: order.created_at }
        });
      }
    }

    const result = await query(
      `INSERT INTO orders
        (name, phone, email, address, comment, configuration, source_url, user_agent,
         order_type, product_id, product_name, color_name, package_name, selected_options,
         total_price, client_request_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb, $15, $16)
       ON CONFLICT (client_request_id) WHERE client_request_id IS NOT NULL
       DO UPDATE SET client_request_id = EXCLUDED.client_request_id
       RETURNING *`,
      [
        name,
        phone,
        email || null,
        address || null,
        comment || null,
        configuration,
        sourceUrl || null,
        request.get("user-agent")?.slice(0, 500) || null,
        orderType,
        productId || null,
        productName || null,
        colorName || null,
        packageName || null,
        JSON.stringify(selectedOptions),
        totalPrice,
        clientRequestId || null
      ]
    );
    const order = result.rows[0];

    // Заявка уже в PostgreSQL. Telegram не может отменить успешное сохранение.
    void notifyOrder(order.id).catch((error) => {
      console.error(`[telegram] unable to enqueue order ${order.id}:`, error.message);
    });
    void notifyOrderByEmail(order.id).catch((error) => {
      console.error(`[email] unable to enqueue order ${order.id}:`, error.message);
    });

    return response.status(201).json({
      ok: true,
      order: { id: order.id, status: order.status, createdAt: order.created_at }
    });
  } catch (error) {
    return next(error);
  }
});
