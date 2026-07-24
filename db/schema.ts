import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const orders = sqliteTable("orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  comment: text("comment"),
  configuration: text("configuration").notNull(),
  status: text("status").notNull().default("new"),
  sourceUrl: text("source_url"),
  userAgent: text("user_agent"),
  emailStatus: text("email_status").notNull().default("pending"),
  emailProviderId: text("email_provider_id"),
  emailError: text("email_error"),
  emailSentAt: text("email_sent_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  processedAt: text("processed_at"),
  deletedAt: text("deleted_at")
}, (table) => [
  index("orders_created_at_idx").on(table.createdAt),
  index("orders_status_idx").on(table.status, table.createdAt)
]);
