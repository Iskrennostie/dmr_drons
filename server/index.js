import { closeDatabase } from "./db.js";
import { drainPendingEmails } from "./email.js";
import { config } from "./config.js";
import { createApp } from "./app.js";

const app = createApp();
const server = app.listen(config.port, () => {
  console.log(`[server] MDR is listening on port ${config.port}`);
});

const runEmailWorker = () => {
  void drainPendingEmails().catch((error) => console.error("[email] queue worker:", error.message));
};

// Notification delivery is intentionally outside the order request path: a
// temporary email-provider delay must never invalidate a saved order.
const initialWorker = setTimeout(runEmailWorker, 1_000);
initialWorker.unref();
const emailWorker = setInterval(runEmailWorker, 60_000);
emailWorker.unref();

const shutdown = async (signal) => {
  console.log(`[server] ${signal}; shutting down`);
  clearTimeout(initialWorker);
  clearInterval(emailWorker);
  server.close(async () => {
    await closeDatabase();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
