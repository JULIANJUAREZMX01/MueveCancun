-- Super App — Migración 002
-- Tablas para comunidad, créditos, negocios y marketplace

-- === CONTRIBUCIONES DE COMUNIDAD ===
CREATE TABLE IF NOT EXISTS contributions (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('new_stop','price_update','photo','delay_alert','route_correction','accessibility_info')),
  route_id TEXT,
  stop_id TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  data JSONB NOT NULL DEFAULT '{}',
  credits_awarded INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','validated','rejected')),
  user_id TEXT,  -- NULL = anonymous
  validator_id TEXT,
  validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contributions_status ON contributions(status);
CREATE INDEX IF NOT EXISTS idx_contributions_route ON contributions(route_id);
CREATE INDEX IF NOT EXISTS idx_contributions_user ON contributions(user_id);

-- === WALLETS DE CRÉDITOS ===
CREATE TABLE IF NOT EXISTS credit_wallets (
  user_id TEXT PRIMARY KEY,
  balance INTEGER NOT NULL DEFAULT 0,
  total_earned INTEGER NOT NULL DEFAULT 0,
  total_spent INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- === TRANSACCIONES DE CRÉDITOS ===
CREATE TABLE IF NOT EXISTS credit_transactions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  user_id TEXT NOT NULL,
  amount INTEGER NOT NULL,  -- positive = earned, negative = spent
  type TEXT NOT NULL CHECK (type IN ('earned','spent','bonus','refund')),
  source TEXT NOT NULL,  -- 'contribution', 'marketplace', 'promo'
  reference_id TEXT,  -- contribution_id or order_id
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_tx_user ON credit_transactions(user_id, created_at DESC);

-- === NEGOCIOS LOCALES ===
CREATE TABLE IF NOT EXISTS businesses (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,  -- 'food', 'pharmacy', 'retail', 'service', 'entertainment'
  description TEXT,
  address TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  phone TEXT,
  website TEXT,
  hours JSONB DEFAULT '{}',  -- {mon: "8:00-20:00", ...}
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free','premium')),
  stripe_subscription_id TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_businesses_geo ON businesses USING GIST (
  ll_to_earth(lat, lng)
) WHERE active = true;
-- Note: requires earthdistance extension. Fallback: lat/lng index
CREATE INDEX IF NOT EXISTS idx_businesses_lat_lng ON businesses(lat, lng) WHERE active = true;

-- === CUPONES ===
CREATE TABLE IF NOT EXISTS coupons (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  business_id TEXT NOT NULL REFERENCES businesses(id),
  code TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent','fixed','free_item')),
  discount_value NUMERIC(10,2),
  max_uses INTEGER,
  uses_count INTEGER NOT NULL DEFAULT 0,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- === CANJES DE CUPONES ===
CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  coupon_id TEXT NOT NULL REFERENCES coupons(id),
  user_id TEXT,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- === ALERTAS EN TIEMPO REAL ===
CREATE TABLE IF NOT EXISTS route_alerts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  route_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('delay','detour','cancelled','strike','weather','accident')),
  message TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'low' CHECK (severity IN ('low','medium','high','critical')),
  reported_by TEXT,  -- user_id or 'system'
  validations INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_route_active ON route_alerts(route_id, active, created_at DESC);

-- === ANALYTICS DE RUTAS ===
CREATE TABLE IF NOT EXISTS route_usage (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  route_id TEXT NOT NULL,
  session_id TEXT,
  action TEXT NOT NULL CHECK (action IN ('view','plan','navigate','share','favorite')),
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partitionable por fecha para performance
CREATE INDEX IF NOT EXISTS idx_usage_route_date ON route_usage(route_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_action_date ON route_usage(action, created_at DESC);

