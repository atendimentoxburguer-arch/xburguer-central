CREATE TABLE IF NOT EXISTS schema_migrations (
  version integer PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY, email text NOT NULL UNIQUE, name text NOT NULL,
  password_hash text NOT NULL, role text NOT NULL CHECK (role IN ('admin','cashier','waiter','kitchen')),
  active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id),
  expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
-- Temporary migration boundary: one canonical legacy document, never two sources.
-- Revision locking prevents lost updates while domains move to command APIs.
CREATE TABLE IF NOT EXISTS store_state (
  id integer PRIMARY KEY CHECK (id=1), revision integer NOT NULL DEFAULT 1,
  document jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS audit_events (
  id bigserial PRIMARY KEY, actor_id uuid REFERENCES users(id), action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS idempotency_keys (
  scope text NOT NULL, key text NOT NULL, request_hash text NOT NULL,
  result jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(scope,key)
);
CREATE TABLE IF NOT EXISTS public_orders (
  tracking_hash text PRIMARY KEY, order_id text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS coupons (
  code text PRIMARY KEY, percent integer NOT NULL CHECK (percent BETWEEN 1 AND 100),
  minimum_cents integer NOT NULL DEFAULT 0 CHECK (minimum_cents>=0),
  max_uses integer NOT NULL CHECK (max_uses>0), uses integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL, active boolean NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS table_links (
  token_hash text PRIMARY KEY, table_id text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO schema_migrations(version) VALUES(1) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS loyalty_ledger (
  id uuid PRIMARY KEY, customer_id text NOT NULL, order_id text NOT NULL,
  delta_cents bigint NOT NULL, reason text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS loyalty_customer ON loyalty_ledger(customer_id);
CREATE TABLE IF NOT EXISTS loyalty_accruals (
  order_id text PRIMARY KEY, customer_id text NOT NULL, amount_cents bigint NOT NULL CHECK(amount_cents>=0),
  rate_percent numeric NOT NULL CHECK(rate_percent BETWEEN 0 AND 100)
);
CREATE TABLE IF NOT EXISTS loyalty_redemptions (
  order_id text PRIMARY KEY, customer_id text NOT NULL, amount_cents bigint NOT NULL CHECK(amount_cents>0),
  refunded boolean NOT NULL DEFAULT false
);
CREATE TABLE IF NOT EXISTS message_events (
  event_id text PRIMARY KEY, received_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS message_outbox (
  id text PRIMARY KEY, request_hash text NOT NULL, chat_id text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending','sent','uncertain')),
  provider_id text, created_at timestamptz NOT NULL DEFAULT now()
);
