-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============ USERS ============
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name VARCHAR(40),
  bio TEXT DEFAULT '',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  is_suspended BOOLEAN NOT NULL DEFAULT FALSE,
  settings JSONB DEFAULT '{}'::jsonb,
  deleted_at TIMESTAMPTZ
);

-- ============ WALLETS ============
CREATE TABLE wallets (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  available_balance BIGINT NOT NULL DEFAULT 0 CHECK (available_balance >= 0),
  reserved_balance BIGINT NOT NULL DEFAULT 0 CHECK (reserved_balance >= 0),
  total_earned BIGINT NOT NULL DEFAULT 0,
  total_spent BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============ WALLET TRANSACTIONS (LEDGER) ============
CREATE TABLE wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL,
  amount BIGINT NOT NULL,
  balance_after BIGINT,
  match_id UUID,
  idempotency_key VARCHAR(100) UNIQUE,
  reason TEXT,
  admin_id UUID REFERENCES users(id),
  status VARCHAR(20) NOT NULL DEFAULT 'completed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_wallet_tx_user ON wallet_transactions(user_id, created_at DESC);
CREATE INDEX idx_wallet_tx_match ON wallet_transactions(match_id);

-- ============ MATCHES ============
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id VARCHAR(20),
  match_type VARCHAR(20) NOT NULL DEFAULT 'casual',
  entry_fee BIGINT NOT NULL DEFAULT 0,
  platform_fee_pct INT NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'created',
  winner_id UUID REFERENCES users(id),
  rules JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============ MATCH PARTICIPANTS ============
CREATE TABLE match_participants (
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  player_slot INT NOT NULL,
  result VARCHAR(20),
  rating_change INT DEFAULT 0,
  tokens_change BIGINT DEFAULT 0,
  PRIMARY KEY (match_id, user_id)
);

-- ============ PLAYER RATINGS ============
CREATE TABLE player_ratings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  rating INT NOT NULL DEFAULT 1000,
  matches_played INT NOT NULL DEFAULT 0,
  wins INT NOT NULL DEFAULT 0,
  losses INT NOT NULL DEFAULT 0,
  current_streak INT NOT NULL DEFAULT 0,
  best_streak INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============ RATING HISTORY ============
CREATE TABLE rating_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  match_id UUID REFERENCES matches(id),
  rating_before INT NOT NULL,
  rating_after INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_rating_history_user ON rating_history(user_id, created_at DESC);

-- ============ ACHIEVEMENTS ============
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50)
);

CREATE TABLE user_achievements (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, achievement_id)
);

-- ============ ADMIN AUDIT LOG ============
CREATE TABLE admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES users(id),
  action VARCHAR(50) NOT NULL,
  target_user_id UUID REFERENCES users(id),
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_admin ON admin_audit_log(admin_id, created_at DESC);

-- ============ SEED INITIAL ACHIEVEMENTS ============
INSERT INTO achievements (code, name, description, icon) VALUES
  ('first_win', 'Primeira Vitória', 'Vença sua primeira partida', 'TbTrophy'),
  ('streak_3', 'Tripla', 'Vença 3 partidas seguidas', 'TbFlame'),
  ('streak_5', 'Em Chamas', 'Vença 5 partidas seguidas', 'TbFlame'),
  ('matches_10', 'Experiente', 'Complete 10 partidas', 'TbTarget'),
  ('matches_50', 'Veterano', 'Complete 50 partidas', 'TbStar'),
  ('rating_1500', 'Dourado', 'Alcance 1500 pontos de rating', 'TbCrown'),
  ('rating_2000', 'Diamante', 'Alcance 2000 pontos de rating', 'TbJewel'),
  ('tokens_5000', 'Acumulador', 'Acumule 5000 fichas no total', 'TbCoin')
ON CONFLICT (code) DO NOTHING;
