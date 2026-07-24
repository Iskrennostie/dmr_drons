import { configureTelegramWebhook } from "../telegram.js";

const result = await configureTelegramWebhook();
console.log("[telegram] webhook configured:", result);
