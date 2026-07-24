import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { query } from "../db.js";
import { notifyOrderByEmail } from "../email.js";
import { notifyOrder } from "../telegram.js";
import { validateOrder } from "../validation.js";

export const ordersRouter = Router();

const orderLimit = rateLimit({
  windowMs: 15 * 60 * 1_000,
  limit: 8,
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
    const { name, phone, comment, configuration, sourceUrl } = validated.data;
    const result = await query(
      `INSERT INTO orders
        (name, phone, comment, configuration, source_url, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, phone, comment || null, configuration, sourceUrl || null, request.get("user-agent")?.slice(0, 500) || null]
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
