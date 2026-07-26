import path from "node:path";
import { fileURLToPath } from "node:url";
import compression from "compression";
import express from "express";
import helmet from "helmet";
import { config, isProduction } from "./config.js";
import { closeDatabase, databaseStatus } from "./db.js";
import { drainPendingEmails } from "./email.js";
import { adminRouter } from "./routes/admin.js";
import { ordersRouter } from "./routes/orders.js";
import { reviewsRouter } from "./routes/reviews.js";
import { telegramRouter } from "./routes/telegram.js";
import { configureTelegramWebhook, drainPendingNotifications } from "./telegram.js";

const app = express();
const serverDir = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(serverDir, "../public");

if (config.trustProxy) app.set("trust proxy", config.trustProxy);
app.disable("x-powered-by");
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "https://api.qrserver.com"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: isProduction ? [] : null
    }
  }
}));
app.use(compression());
app.use(express.json({ limit: "32kb" }));
app.use(express.urlencoded({ extended: false, limit: "32kb" }));

app.get("/api/health", async (_request, response) => {
  const database = await databaseStatus();
  response.status(database.connected ? 200 : 503).json({
    ok: database.connected,
    service: "mdr-api",
    database,
    telegram: {
      configured: Boolean(config.telegramBotToken && config.telegramWebhookSecret),
      bot: `@${config.telegramBotUsername}`,
      admin: `@${config.telegramAdminUsername}`
    },
    email: {
      configured: Boolean(config.resendApiKey && config.orderNotificationEmail),
      recipient: config.orderNotificationEmail
    }
  });
});

app.use("/api/orders", ordersRouter);
app.use("/api/reviews", reviewsRouter);
app.use("/api/admin", adminRouter);
app.use("/api/telegram", telegramRouter);

app.use(express.static(publicDir, {
  extensions: ["html"],
  maxAge: isProduction ? "1h" : 0,
  setHeaders(response, filePath) {
    if (filePath.endsWith(".html")) response.setHeader("Cache-Control", "no-cache");
    if (filePath.includes(`${path.sep}assets${path.sep}`)) {
      response.setHeader("Cache-Control", "public, max-age=604800, immutable");
    }
  }
}));

app.use("/api", (_request, response) => {
  response.status(404).json({ ok: false, error: "API route not found." });
});

app.use((error, request, response, _next) => {
  const databaseUnavailable = error.code === "DATABASE_NOT_CONFIGURED";
  const status = databaseUnavailable ? 503 : 500;
  console.error(`[api] ${request.method} ${request.originalUrl}:`, error);
  response.status(status).json({
    ok: false,
    error: databaseUnavailable
      ? "Сервис заявок ещё не подключён. Позвоните или напишите нам."
      : "Не удалось выполнить запрос. Попробуйте ещё раз."
  });
});

const server = app.listen(config.port, () => {
  console.log(`[server] MDR is listening on http://localhost:${config.port}`);
  if (!config.databaseUrl) console.warn("[server] DATABASE_URL is not configured; order API is unavailable.");

  if (config.telegramBotToken && config.telegramWebhookSecret && config.autoSetupTelegramWebhook) {
    configureTelegramWebhook()
      .then(() => console.log("[telegram] webhook configured"))
      .catch((error) => console.error("[telegram] webhook setup failed:", error.message));
  }

  setTimeout(() => void drainPendingNotifications(), 4_000).unref();
  setTimeout(() => void drainPendingEmails(), 5_000).unref();
});

const retryTimer = setInterval(() => void drainPendingNotifications(), 60_000);
retryTimer.unref();
const emailRetryTimer = setInterval(() => void drainPendingEmails(), 75_000);
emailRetryTimer.unref();

const shutdown = async (signal) => {
  console.log(`[server] ${signal}, shutting down`);
  clearInterval(retryTimer);
  clearInterval(emailRetryTimer);
  server.close(async () => {
    await closeDatabase();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
