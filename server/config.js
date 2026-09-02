import "dotenv/config";

const integer = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const boolean = (value, fallback = false) => {
  if (value == null || value === "") return fallback;
  return /^(1|true|yes|on)$/i.test(value);
};

export const config = Object.freeze({
  nodeEnv: process.env.NODE_ENV || "development",
  port: integer(process.env.PORT, 3000),
  databaseUrl: process.env.DATABASE_URL || "",
  databaseSsl: boolean(process.env.DATABASE_SSL, process.env.NODE_ENV === "production"),
  resendApiKey: process.env.RESEND_API_KEY || "",
  orderNotificationEmail: process.env.ORDER_NOTIFICATION_EMAIL || "itaci3367@gmail.com",
  orderEmailFrom: process.env.ORDER_EMAIL_FROM || "MDR <onboarding@resend.dev>",
  jwtSecret: process.env.JWT_SECRET || "",
  adminPassword: process.env.ADMIN_PASSWORD || "",
  trustProxy: integer(process.env.TRUST_PROXY, process.env.NODE_ENV === "production" ? 1 : 0)
});

export const isProduction = config.nodeEnv === "production";
