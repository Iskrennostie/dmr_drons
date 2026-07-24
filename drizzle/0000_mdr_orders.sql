CREATE TABLE IF NOT EXISTS `orders` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `name` text NOT NULL,
  `phone` text NOT NULL,
  `comment` text,
  `configuration` text NOT NULL,
  `status` text DEFAULT 'new' NOT NULL,
  `source_url` text,
  `user_agent` text,
  `email_status` text DEFAULT 'pending' NOT NULL,
  `email_provider_id` text,
  `email_error` text,
  `email_sent_at` text,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `processed_at` text,
  `deleted_at` text
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `orders_created_at_idx` ON `orders` (`created_at` DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `orders_status_idx` ON `orders` (`status`,`created_at` DESC);
