-- ============================================================
--  UXLearn Database Schema
--  Safe upsert patterns used throughout — no silent overwrites
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Users ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name              VARCHAR(255) NOT NULL,
  email             VARCHAR(255) UNIQUE NOT NULL,
  password_hash     VARCHAR(255) NOT NULL,
  plan              VARCHAR(20)  NOT NULL DEFAULT 'free'
                    CHECK (plan IN ('free', 'pro', 'lifetime')),
  referral_code     VARCHAR(20)  UNIQUE,          -- this user's shareable code
  referred_by_code  VARCHAR(20),                  -- promo/referral code they used at signup
  is_verified       BOOLEAN     DEFAULT FALSE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ── Courses ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS courses (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title            VARCHAR(255) NOT NULL,
  track            VARCHAR(50)  NOT NULL,
  level            VARCHAR(20)  NOT NULL CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  total_modules    INTEGER      NOT NULL CHECK (total_modules > 0),
  duration_hours   INTEGER,
  is_free          BOOLEAN     DEFAULT FALSE,
  price_paise      INTEGER      DEFAULT 0,         -- 0 for free courses
  original_price_paise INTEGER  DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── Enrollments ───────────────────────────────────────────────
-- UNIQUE constraint prevents duplicate enrollments
CREATE TABLE IF NOT EXISTS enrollments (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id    UUID        NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  enrolled_at  TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,                        -- set when all modules done
  UNIQUE (user_id, course_id)
);

-- ── Module Progress ───────────────────────────────────────────
-- UNIQUE (user_id, course_id, module_number) is the key guard:
-- a completed module can NEVER be un-completed or re-inserted
CREATE TABLE IF NOT EXISTS module_progress (
  id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id      UUID    NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  module_number  INTEGER NOT NULL CHECK (module_number >= 1),
  completed_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, course_id, module_number)       -- prevents any overwrite
);

-- ── Payments ─────────────────────────────────────────────────
-- Append-only: status is set at creation or on verified webhook only
CREATE TABLE IF NOT EXISTS payments (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID        NOT NULL REFERENCES users(id),
  razorpay_order_id     VARCHAR(255) UNIQUE NOT NULL,
  razorpay_payment_id   VARCHAR(255) UNIQUE,
  razorpay_signature    VARCHAR(512),
  amount_paise          INTEGER     NOT NULL,
  currency              VARCHAR(10) DEFAULT 'INR',
  plan                  VARCHAR(20) CHECK (plan IN ('pro', 'lifetime')),
  course_id             UUID        REFERENCES courses(id),  -- NULL for plan upgrades
  status                VARCHAR(20) DEFAULT 'created'
                        CHECK (status IN ('created', 'paid', 'failed', 'refunded')),
  promo_code_used       VARCHAR(20),
  discount_paise        INTEGER     DEFAULT 0,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  paid_at               TIMESTAMPTZ
);

-- ── Promo / Referral Codes ────────────────────────────────────
CREATE TABLE IF NOT EXISTS promo_codes (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code             VARCHAR(20) UNIQUE NOT NULL,
  discount_percent INTEGER     NOT NULL CHECK (discount_percent BETWEEN 1 AND 100),
  max_uses         INTEGER,                         -- NULL = unlimited
  current_uses     INTEGER     DEFAULT 0,
  valid_from       TIMESTAMPTZ DEFAULT NOW(),
  valid_until      TIMESTAMPTZ,                     -- NULL = never expires
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── User Referral Rewards ─────────────────────────────────────
-- Tracks when a referral leads to a paid conversion
CREATE TABLE IF NOT EXISTS referral_rewards (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id       UUID        NOT NULL REFERENCES users(id),
  referred_user_id  UUID        NOT NULL REFERENCES users(id),
  payment_id        UUID        NOT NULL REFERENCES payments(id),
  reward_type       VARCHAR(50) DEFAULT 'discount',
  rewarded_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (payment_id)                              -- one reward per payment
);

-- ── Certificates ──────────────────────────────────────────────
-- Issued only when enrollment.completed_at is set
CREATE TABLE IF NOT EXISTS certificates (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID        NOT NULL REFERENCES users(id),
  course_id          UUID        NOT NULL REFERENCES courses(id),
  enrollment_id      UUID        NOT NULL REFERENCES enrollments(id),
  certificate_number VARCHAR(60) UNIQUE NOT NULL,   -- e.g. UXL-2025-A3F9C2
  issued_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, course_id)                       -- one cert per course per user
);

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_enrollments_user     ON enrollments (user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course   ON enrollments (course_id);
CREATE INDEX IF NOT EXISTS idx_progress_user_course ON module_progress (user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_payments_user        ON payments (user_id);
CREATE INDEX IF NOT EXISTS idx_payments_order       ON payments (razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_certs_user           ON certificates (user_id);

-- ── Auto-update updated_at ────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Seed: Sample Courses ──────────────────────────────────────
INSERT INTO courses (title, track, level, total_modules, duration_hours, is_free, price_paise, original_price_paise)
VALUES
  ('UI/UX for Product Designers & Side-Hustle Pros', 'product_design', 'beginner',   8, 24, TRUE,  0,       0),
  ('Advanced UX: Research, Prototyping & Client Delivery', 'product_design', 'advanced', 10, 30, FALSE, 99900,  249900),
  ('UI/UX for Hackathons & College Projects',        'hackathon',      'beginner',   6, 16, TRUE,  0,       0),
  ('Final Year Project UI: From Idea to Submission', 'hackathon',      'intermediate',7, 20, FALSE, 69900,  149900),
  ('Creative UI/UX: Typography, Color & Visual Hierarchy', 'creative', 'beginner',   7, 18, TRUE,  0,       0),
  ('Motion Design & Micro-Interactions for Apps',    'creative',       'intermediate',5, 14, FALSE, 79900,  199900),
  ('Modern Web Dev: HTML, CSS & JavaScript with AI', 'webdev_ai',      'beginner',   9, 28, TRUE,  0,       0),
  ('React + AI: Ship Full-Stack Apps in Days',       'webdev_ai',      'intermediate',11,35, FALSE, 129900, 349900)
ON CONFLICT DO NOTHING;

-- ── Seed: Sample Promo Codes ──────────────────────────────────
INSERT INTO promo_codes (code, discount_percent, max_uses, valid_until)
VALUES
  ('LAUNCH50',  50, 100, NOW() + INTERVAL '30 days'),
  ('STUDENT20', 20, NULL, NULL),
  ('HACKATHON', 30, 500, NOW() + INTERVAL '60 days')
ON CONFLICT DO NOTHING;
