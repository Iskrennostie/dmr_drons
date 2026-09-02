import path from "node:path";
import { fileURLToPath } from "node:url";
import compression from "compression";
import express from "express";
import helmet from "helmet";
import { config, isProduction } from "./config.js";
import { databaseStatus, isDatabaseUnavailable } from "./db.js";
import { adminRouter } from "./routes/admin.js";
import { ordersRouter } from "./routes/orders.js";
import { reviewsRouter } from "./routes/reviews.js";

const serverDir = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(serverDir, "../public");

export const createApp = () => {
  const app = express();
  if (config.trustProxy) app.set("trust proxy", config.trustProxy);
  app.disable("x-powered-by");
  app.use(helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        // The catalog uses controlled CSS variables for the selected finish and
        // live metric width. They are style attributes, not executable code.
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
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

  // Liveness endpoint: Render must not restart a healthy Node process while
  // PostgreSQL is still establishing its first connection after an idle period.
  app.get("/api/health", (_request, response) => {
    response.status(200).json({ ok: true, service: "mdr-api", uptimeSeconds: Math.floor(process.uptime()) });
  });

  // Readiness is separate and is useful for diagnostics, not for platform liveness.
  app.get("/api/readiness", async (_request, response) => {
    const database = await databaseStatus();
    response.status(database.connected ? 200 : 503).json({
      ok: database.connected,
      service: "mdr-api",
      database,
      email: { configured: Boolean(config.resendApiKey && config.orderNotificationEmail) }
    });
  });

  app.use("/api/orders", ordersRouter);
  app.use("/api/reviews", reviewsRouter);
  app.use("/api/admin", adminRouter);

  app.use(express.static(publicDir, {
    extensions: ["html"],
    maxAge: isProduction ? "1h" : 0,
    setHeaders(response, filePath) {
      if (filePath.endsWith(".html")) response.setHeader("Cache-Control", "no-cache");
      if (/\/(?:assets|js|styles)\//.test(filePath)) {
        response.setHeader("Cache-Control", isProduction ? "public, max-age=604800, immutable" : "no-cache");
      }
    }
  }));

  app.use("/api", (_request, response) => response.status(404).json({ ok: false, error: "API route not found." }));
  app.use((error, request, response, _next) => {
    const unavailable = isDatabaseUnavailable(error);
    const status = unavailable ? 503 : 500;
    console.error(`[api] ${request.method} ${request.originalUrl}:`, error);
    response.status(status).json({
      ok: false,
      error: unavailable
        ? "Сервис заявок временно подключается к базе. Повторите отправку через несколько секунд."
        : "Не удалось выполнить запрос. Попробуйте ещё раз."
    });
  });
  return app;
};
