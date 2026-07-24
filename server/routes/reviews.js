import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { query } from "../db.js";
import { validateReview } from "../validation.js";

export const reviewsRouter = Router();

const reviewLimit = rateLimit({
  windowMs: 15 * 60 * 1_000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { ok: false, error: "Слишком много отзывов с этого устройства. Попробуйте позже." }
});

reviewsRouter.get("/", async (_request, response, next) => {
  try {
    const result = await query(
      `SELECT id, name, product_id, product_name, rating, comment, created_at
         FROM reviews
        WHERE status = 'approved'
        ORDER BY approved_at DESC NULLS LAST, created_at DESC
        LIMIT 60`
    );
    return response.json({ ok: true, reviews: result.rows });
  } catch (error) {
    return next(error);
  }
});

reviewsRouter.post("/", reviewLimit, async (request, response, next) => {
  try {
    const validated = validateReview(request.body);
    if (!validated.ok) {
      return response.status(422).json({
        ok: false,
        error: "Проверьте заполненные поля.",
        fields: validated.errors
      });
    }
    const { name, productId, productName, rating, comment, sourceUrl } = validated.data;
    const result = await query(
      `INSERT INTO reviews
        (name, product_id, product_name, rating, comment, source_url, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, status, created_at`,
      [
        name,
        productId || null,
        productName || null,
        rating,
        comment,
        sourceUrl || null,
        request.get("user-agent")?.slice(0, 500) || null
      ]
    );
    return response.status(201).json({ ok: true, review: result.rows[0] });
  } catch (error) {
    return next(error);
  }
});
