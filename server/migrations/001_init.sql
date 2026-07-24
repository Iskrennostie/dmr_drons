BEGIN;

CREATE TABLE IF NOT EXISTS orders (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  phone VARCHAR(40) NOT NULL,
  comment TEXT,
  configuration TEXT NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'processed', 'deleted')),
  source_url TEXT,
  user_agent TEXT,
  telegram_status VARCHAR(24) NOT NULL DEFAULT 'pending'
    CHECK (telegram_status IN ('pending', 'sending', 'sent', 'failed')),
  telegram_attempts INTEGER NOT NULL DEFAULT 0,
  telegram_last_attempt_at TIMESTAMPTZ,
  telegram_message_id BIGINT,
  telegram_error TEXT,
  telegram_sent_at TIMESTAMPTZ,
  email_status VARCHAR(24) NOT NULL DEFAULT 'pending'
    CHECK (email_status IN ('pending', 'sending', 'sent', 'failed', 'unconfigured')),
  email_attempts INTEGER NOT NULL DEFAULT 0,
  email_last_attempt_at TIMESTAMPTZ,
  email_provider_id TEXT,
  email_error TEXT,
  email_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders (status, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_telegram_queue_idx
  ON orders (telegram_status, telegram_attempts, created_at)
  WHERE status = 'new';
CREATE INDEX IF NOT EXISTS orders_email_queue_idx
  ON orders (email_status, email_attempts, created_at)
  WHERE status = 'new';

CREATE TABLE IF NOT EXISTS bot_admins (
  chat_id BIGINT PRIMARY KEY,
  username VARCHAR(64) NOT NULL,
  display_name VARCHAR(160),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS schema_migrations (
  filename TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;
