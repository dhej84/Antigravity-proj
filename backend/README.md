# UXLearn Backend API

Node.js · Express · PostgreSQL · Razorpay

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy and fill in your environment variables
cp .env.example .env

# 3. Create DB and run schema
createdb uxlearn
psql uxlearn -f schema.sql

# 4. Start dev server
npm run dev
```

---

## API Reference

All protected routes require `Authorization: Bearer <token>` header.

### Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | ✗ | Register; optionally pass `promo_code` |
| POST | `/api/auth/login` | ✗ | Login; returns access + refresh tokens |
| POST | `/api/auth/refresh` | ✗ | Exchange refresh token for new access token |
| GET | `/api/auth/me` | ✓ | Get current user profile |
| PATCH | `/api/auth/me` | ✓ | Update name |

### Courses

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/courses` | ✗ | List courses; filter by `?track=&level=` |
| GET | `/api/courses/:id` | ✗ | Get single course |
| POST | `/api/courses/:id/enroll` | ✓ | Enroll in a course |
| GET | `/api/courses/enrolled/me` | ✓ | My enrollments with progress |
| POST | `/api/courses/:id/progress` | ✓ | Mark module complete — body: `{ module_number: 3 }` |
| GET | `/api/courses/:id/progress` | ✓ | Get full progress for a course |

### Payments (Razorpay)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/payments/plans` | ✗ | Plan pricing |
| POST | `/api/payments/create-order` | ✓ | Create Razorpay order |
| POST | `/api/payments/verify` | ✓ | Verify payment after checkout |
| POST | `/api/payments/webhook` | ✗ | Razorpay server webhook (raw body) |
| GET | `/api/payments/history` | ✓ | My payment history |

**Create-order body:**
```json
// Plan purchase
{ "type": "plan", "plan": "pro", "promo_code": "LAUNCH50" }

// Course purchase
{ "type": "course", "course_id": "<uuid>", "promo_code": "STUDENT20" }
```

### Certificates

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/certificates` | ✓ | My certificates |
| GET | `/api/certificates/verify/:certNumber` | ✗ | Public verification |

### Dashboard

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/dashboard` | ✓ | Full dashboard snapshot |

### Referral & Promo

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/referral/my-code` | ✓ | My referral code + stats |
| GET | `/api/referral/who-i-referred` | ✓ | Users who signed up via my code |
| POST | `/api/referral/validate-promo` | ✓ | Validate promo code on checkout |

---

## Data Integrity Guarantees

| Concern | How it's handled |
|---------|-----------------|
| Duplicate enrollments | `ON CONFLICT (user_id, course_id) DO NOTHING` |
| Duplicate module progress | `ON CONFLICT (user_id, course_id, module_number) DO NOTHING` |
| Double-paying | Payment only updated from `created → paid`; never touched again |
| Plan downgrades | `UPDATE users SET plan = $1 WHERE plan = 'free' OR (plan = 'pro' AND $1 = 'lifetime')` |
| Referral double-rewards | `ON CONFLICT (payment_id) DO NOTHING` |
| Overwriting certificates | `ON CONFLICT (user_id, course_id) DO NOTHING` |
| Webhook replay attacks | Razorpay signature verified with `HMAC-SHA256` |

---

## Environment Variables

See `.env.example` for all required variables.
