# Craftovon ReplyBridge

> **Automate every reel's DMs, hands-free.** — Instagram comment→DM automation SaaS built on MERN + TypeScript.

## Stack

| Layer | Technology |
|---|---|
| API | Node 20 + Express 4 + TypeScript |
| Workers | BullMQ + Redis |
| Frontend | React 18 + Vite + Tailwind CSS |
| Database | MongoDB (Mongoose 8) |
| Queue / Cache | Redis (BullMQ + ioredis) |
| Monorepo | npm workspaces + Turborepo |

---

## Quick Start (Docker — recommended)

```bash
# 1. Clone and enter the repo
git clone <repo-url>
cd craftovon-replybridge

# 2. Copy env and fill in real values
cp .env.example .env
# Edit .env — at minimum set MONGO_URI, REDIS_URL, JWT_SECRET,
# ENCRYPTION_KEY, META_APP_ID, META_APP_SECRET, WEBHOOK_VERIFY_TOKEN

# 3. Start all services (mongo + redis + api + workers + web)
docker-compose up --build

# 4. Seed plans + templates + help articles
npm run seed

# 5. Open the app
open http://localhost:5173
```

**Health check:** `curl http://localhost:8080/healthz`

---

## Manual (without Docker)

### Prerequisites
- Node 20+
- MongoDB 7 running locally (`mongod`)
- Redis 7 running locally (`redis-server`)

```bash
# Install all workspace dependencies
npm install

# Start API (port 8080)
cd apps/api && npm run dev

# Start Workers (port 9090 metrics)
cd apps/workers && npm run dev

# Start Frontend (port 5173)
cd apps/web && npm run dev

# Seed database
npm run seed
```

---

## Environment Variables

See [`.env.example`](.env.example) for the full list. Key variables:

| Variable | Description |
|---|---|
| `META_APP_ID` | From Meta App Dashboard |
| `META_APP_SECRET` | App secret (store in KMS in prod) |
| `WEBHOOK_VERIFY_TOKEN` | Random string matching Meta Dashboard |
| `ENCRYPTION_KEY` | 32-byte base64 key for AES-256-GCM token encryption |
| `JWT_SECRET` | Min 64 random bytes |
| `MONGO_URI` | MongoDB connection string |
| `REDIS_URL` | Redis connection string |
| `STRIPE_SECRET_KEY` | Stripe billing integration |

Generate keys:
```bash
# JWT secret
openssl rand -base64 64
# Encryption key (32 bytes)
openssl rand -base64 32
```

---

## Monorepo Layout

```
craftovon-replybridge/
├── apps/
│   ├── api/          # Express API (port 8080)
│   ├── workers/      # BullMQ workers (metrics port 9090)
│   └── web/          # React + Vite SPA (port 5173)
├── packages/
│   ├── db/           # Mongoose models + seed script
│   ├── schemas/      # Shared Zod schemas + TypeScript types
│   └── graph/        # Instagram Graph API client (v21.0)
└── infra/
    ├── docker-compose.yml
    └── deploy/       # Dockerfiles
```

---

## Testing

```bash
# Run all tests
npm run test

# API integration tests only
npm run test --workspace=apps/api

# Worker unit + integration tests
npm run test --workspace=apps/workers
```

Tests use **vitest** + **supertest** + **mongodb-memory-server**. All Graph API calls are stubbed via `MockGraphClient`.

---

## Meta App Configuration

| Setting | Value |
|---|---|
| Webhook callback URL | `https://api.craftovon.com/webhook` |
| Webhook verify token | `WEBHOOK_VERIFY_TOKEN` from `.env` |
| Webhook fields | `comments`, `messages`, `messaging_postbacks`, `message_echoes` |
| OAuth redirect URI | `https://api.craftovon.com/oauth/instagram/callback` |
| Required scopes | `instagram_business_basic`, `instagram_business_manage_comments`, `instagram_business_manage_messages` |

---

## Security Notes

- **Access tokens** are **never stored in plaintext** — only as AES-256-GCM ciphertext (`tokenCipher` field). Decryption happens only inside BullMQ workers.
- **Webhook requests** are verified via HMAC-SHA256 (`X-Hub-Signature-256`) before any processing.
- **Webhook ACK** is sent < 50ms; all Graph API calls are asynchronous via BullMQ.
- **ConversationState** TTL = 24h (matches Meta's messaging window) — no cold DMs ever sent.

---

## Secret Rotation Runbook

1. **ENCRYPTION_KEY rotation:** Generate new key → re-encrypt all `tokenCipher` fields with new key → deploy new `ENCRYPTION_KEY` → verify token health.
2. **JWT_SECRET rotation:** All active sessions invalidate on next token refresh. Deploy new value → users re-login on next 401.
3. **META_APP_SECRET rotation:** Update in Meta App Dashboard first → update `.env` → redeploy → verify webhook signatures.

---

## License

MIT — see [LICENSE](LICENSE).
