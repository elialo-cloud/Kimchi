-- Kimchi Cloud Sync — Cloudflare D1
-- One JSON document per authenticated user.
CREATE TABLE IF NOT EXISTS app_state (
  user_id TEXT PRIMARY KEY,
  data_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_app_state_updated_at ON app_state(updated_at);
