import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { issueAdminToken, passwordMatches, requireAdmin } from "../auth.js";
import { query } from "../db.js";
import { normalizeStatus } from "../validation.js";

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
