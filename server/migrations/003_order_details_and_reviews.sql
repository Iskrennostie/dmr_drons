BEGIN;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS email VARCHAR(320),
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS order_type VARCHAR(24) NOT NULL DEFAULT 'inquiry'
    CHECK (order_type IN ('inquiry', 'purchase')),
  ADD COLUMN IF NOT EXISTS product_id VARCHAR(64),
  ADD COLUMN IF NOT EXISTS product_name VARCHAR(160),
  ADD COLUMN IF NOT EXISTS color_name VARCHAR(160),
  ADD COLUMN IF NOT EXISTS package_name VARCHAR(160),
  ADD COLUMN IF NOT EXISTS selected_options JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS total_price INTEGER,
  ADD COLUMN IF NOT EXISTS client_request_id VARCHAR(100);

CREATE UNIQUE INDEX IF NOT EXISTS orders_client_request_id_idx
  ON orders (client_request_id)
  WHERE client_request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS orders_product_id_idx
  ON orders (product_id, created_at DESC);

CREATE TABLE IF NOT EXISTS reviews (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  product_id VARCHAR(64),
  product_name VARCHAR(160),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  source_url TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS reviews_status_created_at_idx
  ON reviews (status, created_at DESC);

COMMIT;
