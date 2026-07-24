import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { issueAdminToken, passwordMatches, requireAdmin } from "../auth.js";
import { query } from "../db.js";
import { notifyOrderByEmail } from "../email.js";
import { normalizeReviewStatus, normalizeStatus } from "../validation.js";

export const adminRouter = Router();

const loginLimit = rateLimit({
  windowMs: 15 * 60 * 1_000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { ok: false, error: "Слишком много попыток входа." }
});

adminRouter.post("/login", loginLimit, (request, response) => {
  if (!passwordMatches(request.body?.password)) {
    return response.status(401).json({ ok: false, error: "Неверный пароль." });
  }
  try {
    return response.json({ ok: true, token: issueAdminToken(), expiresIn: 28_800 });
  } catch (error) {
    return response.status(503).json({ ok: false, error: error.message });
  }
});

adminRouter.use(requireAdmin);

adminRouter.get("/orders", async (request, response, next) => {
  try {
    const status = request.query.status ? normalizeStatus(request.query.status) : null;
    const result = status
      ? await query("SELECT * FROM orders WHERE status = $1 ORDER BY created_at DESC LIMIT 200", [status])
      : await query("SELECT * FROM orders ORDER BY created_at DESC LIMIT 200");
    return response.json({ ok: true, orders: result.rows });
  } catch (error) {
    return next(error);
  }
});

adminRouter.patch("/orders/:id", async (request, response, next) => {
  try {
    const status = normalizeStatus(request.body?.status);
    if (!status) return response.status(422).json({ ok: false, error: "Недопустимый статус." });
    const result = await query(
      `UPDATE orders
          SET status = $2,
              processed_at = CASE WHEN $2 = 'processed' THEN COALESCE(processed_at, NOW()) ELSE processed_at END,
              deleted_at = CASE WHEN $2 = 'deleted' THEN COALESCE(deleted_at, NOW()) ELSE deleted_at END
        WHERE id = $1
        RETURNING *`,
      [request.params.id, status]
    );
    if (!result.rows[0]) return response.status(404).json({ ok: false, error: "Заявка не найдена." });
    return response.json({ ok: true, order: result.rows[0] });
  } catch (error) {
    return next(error);
  }
});

adminRouter.delete("/orders/:id", async (request, response, next) => {
  try {
    const result = await query(
      `UPDATE orders
          SET status = 'deleted', deleted_at = COALESCE(deleted_at, NOW())
        WHERE id = $1
        RETURNING id, status`,
      [request.params.id]
    );
    if (!result.rows[0]) return response.status(404).json({ ok: false, error: "Заявка не найдена." });
    return response.json({ ok: true, order: result.rows[0] });
  } catch (error) {
    return next(error);
  }
});

adminRouter.post("/orders/:id/resend-email", async (request, response, next) => {
  try {
    const result = await query(
      `UPDATE orders
          SET email_status = 'pending',
              email_attempts = 0,
              email_error = NULL
        WHERE id = $1
        RETURNING id`,
      [request.params.id]
    );
    if (!result.rows[0]) return response.status(404).json({ ok: false, error: "Заявка не найдена." });
    void notifyOrderByEmail(result.rows[0].id).catch((error) => {
      console.error(`[email] manual retry for order ${request.params.id}:`, error.message);
    });
    return response.json({ ok: true, order: { id: result.rows[0].id, email_status: "pending" } });
  } catch (error) {
    return next(error);
  }
});

adminRouter.get("/reviews", async (request, response, next) => {
  try {
    const status = request.query.status ? normalizeReviewStatus(request.query.status) : null;
    const result = status
      ? await query("SELECT * FROM reviews WHERE status = $1 ORDER BY created_at DESC LIMIT 200", [status])
      : await query("SELECT * FROM reviews ORDER BY created_at DESC LIMIT 200");
    return response.json({ ok: true, reviews: result.rows });
  } catch (error) {
    return next(error);
  }
});

adminRouter.patch("/reviews/:id", async (request, response, next) => {
  try {
    const status = normalizeReviewStatus(request.body?.status);
    if (!status) return response.status(422).json({ ok: false, error: "Недопустимый статус отзыва." });
    const result = await query(
      `UPDATE reviews
          SET status = $2,
              approved_at = CASE WHEN $2 = 'approved' THEN COALESCE(approved_at, NOW()) ELSE approved_at END,
              rejected_at = CASE WHEN $2 = 'rejected' THEN COALESCE(rejected_at, NOW()) ELSE rejected_at END
        WHERE id = $1
        RETURNING *`,
      [request.params.id, status]
    );
    if (!result.rows[0]) return response.status(404).json({ ok: false, error: "Отзыв не найден." });
    return response.json({ ok: true, review: result.rows[0] });
  } catch (error) {
    return next(error);
  }
});
