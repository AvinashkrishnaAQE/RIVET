-- Authentication schema: users, sessions, password reset tokens, audit events.
-- Applied by `npm run migrate` (scripts/migrate.js), which wraps this file in a
-- transaction and records it in schema_migrations.

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
CREATE TABLE users (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email                 text        NOT NULL,
  password_hash         text        NOT NULL,           -- argon2id encoded hash
  name                  text        NOT NULL,
  role                  text        NOT NULL DEFAULT 'user',
  status                text        NOT NULL DEFAULT 'active',
  failed_login_attempts integer     NOT NULL DEFAULT 0,
  locked_until          timestamptz,
  last_login_at         timestamptz,
  password_changed_at   timestamptz NOT NULL DEFAULT now(),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_email_key       UNIQUE (email),
  CONSTRAINT users_email_lowercase CHECK (email = lower(email)),
  CONSTRAINT users_role_check      CHECK (role IN ('user', 'admin')),
  CONSTRAINT users_status_check    CHECK (status IN ('active', 'disabled'))
);

CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- sessions: one row per login. The opaque refresh token is stored only as a
-- SHA-256 hash. The previous hash is kept so a replayed (already rotated)
-- token can be detected and the whole session revoked.
-- ---------------------------------------------------------------------------
CREATE TABLE sessions (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  refresh_token_hash      text        NOT NULL,
  prev_refresh_token_hash text,
  rotated_at              timestamptz,
  user_agent              text,
  ip                      text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  last_used_at            timestamptz NOT NULL DEFAULT now(),
  expires_at              timestamptz NOT NULL,           -- sliding idle expiry
  absolute_expires_at     timestamptz NOT NULL,           -- hard cap, never extended
  revoked_at              timestamptz,
  revoked_reason          text,
  CONSTRAINT sessions_refresh_token_hash_key UNIQUE (refresh_token_hash)
);

CREATE INDEX sessions_user_active_idx ON sessions (user_id) WHERE revoked_at IS NULL;
CREATE INDEX sessions_prev_hash_idx   ON sessions (prev_refresh_token_hash) WHERE prev_refresh_token_hash IS NOT NULL;
CREATE INDEX sessions_expires_at_idx  ON sessions (expires_at);

-- ---------------------------------------------------------------------------
-- password_reset_tokens: single-use, short-lived, stored hashed.
-- ---------------------------------------------------------------------------
CREATE TABLE password_reset_tokens (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash   text        NOT NULL,
  expires_at   timestamptz NOT NULL,
  used_at      timestamptz,
  requested_ip text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT password_reset_tokens_token_hash_key UNIQUE (token_hash)
);

CREATE INDEX password_reset_tokens_user_idx    ON password_reset_tokens (user_id);
CREATE INDEX password_reset_tokens_expires_idx ON password_reset_tokens (expires_at);

-- ---------------------------------------------------------------------------
-- auth_events: append-only security audit trail.
-- ---------------------------------------------------------------------------
CREATE TABLE auth_events (
  id         bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    uuid        REFERENCES users (id) ON DELETE SET NULL,
  email      text,
  event      text        NOT NULL,
  ip         text,
  user_agent text,
  metadata   jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX auth_events_user_idx    ON auth_events (user_id, created_at DESC);
CREATE INDEX auth_events_created_idx ON auth_events (created_at);
