import { Router } from "express";
import { config } from "../config.js";
import { handleTelegramUpdate } from "../telegram.js";

export const telegramRouter = Router();

telegramRouter.post("/webhook", async (request, response, next) => {
  const receivedSecret = request.get("x-telegram-bot-api-secret-token") || "";
  if (!config.telegramWebhookSecret || receivedSecret !== config.telegramWebhookSecret) {
    return response.status(401).json({ ok: false });
  }
  try {
    await handleTelegramUpdate(request.body);
    return response.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});
