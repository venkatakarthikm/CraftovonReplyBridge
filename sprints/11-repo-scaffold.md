# 11 — Repo Scaffold, Env Vars & Dependencies

## 1. Monorepo layout (npm workspaces + TypeScript)

```
replivault/
├── package.json                  # workspaces: ["apps/*", "packages/*"]
├── turbo.json                    # optional; plain npm workspaces fine
├── .env.example
├── apps/
│   ├── api/                      # Express + TS
│   │   └── src/
│   │       ├── server.ts         # bootstrap, helmet, raw-body webhook mount
│   │       ├── config/           # env.ts (zod-validated), constants.ts
│   │       ├── middleware/       # auth.ts, rbac.ts, rateLimit.ts, errors.ts
│   │       ├── routes/
│   │       │   ├── webhook.routes.ts      # GET verify + POST intake (raw body, HMAC)
│   │       │   ├── auth.routes.ts
│   │       │   ├── instagram.routes.ts    # authorize, callback, accounts, refresh
│   │       │   ├── media.routes.ts
│   │       │   ├── automation.routes.ts
│   │       │   ├── template.routes.ts
│   │       │   ├── inbox.routes.ts
│   │       │   ├── analytics.routes.ts
│   │       │   ├── billing.routes.ts
│   │       │   └── public.routes.ts       # /privacy-policy, /terms, /data-deletion, /help
│   │       ├── controllers/
│   │       ├── services/         # graphClient.ts, crypto.ts, jwt.ts, usage.ts
│   │       └── queues/           # producers only (wf-events, backfill)
│   ├── workers/                  # BullMQ processors
│   │   └── src/
│   │       ├── commentWorker.ts  # guards + orchestration (doc 04)
│   │       ├── dmWorker.ts       # grouped rate-limited sends + 80002 backoff
│   │       ├── backfillWorker.ts # media import + old-comments backfill
│   │       └── tokenRefreshWorker.ts      # cron
│   └── web/                      # Vite + React + TS + Tailwind + Zustand + React Query
│       └── src/
│           ├── pages/            # Dashboard, Reels, AutomationEditor, Templates,
│           │                     # Inbox, Analytics, Settings, Help, Landing, Legal
│           ├── components/       # ui/, tour/ (Joyride steps from doc 06)
│           ├── api/              # generated fetch client from 03-api-spec
│           └── stores/
├── packages/
│   ├── schemas/                  # shared zod schemas + TS types (API contracts)
│   ├── db/                       # mongoose models (doc 02) + seed scripts
│   └── graph/                    # thin typed Instagram Graph API client
│       ├── client.ts             # v21.0 endpoints, token from decrypt service
│       ├── messaging.ts          # sendPrivateReply, buttonTemplate, webUrlButton
│       ├── comments.ts           # listComments, replyToComment
│       └── media.ts              # listMedia
└── infra/
    ├── docker-compose.yml        # mongo, redis, api, workers, web (dev)
    └── deploy/                   # Dockerfile, Fly.io/Railway/Render config
```

## 2. `.env.example` (zod-validated at boot; never commit real values)

```bash
# Meta
META_APP_ID=
META_APP_SECRET=
META_APP_CONFIG_ID=            # Business Login config id
WEBHOOK_VERIFY_TOKEN=          # random string, reused in App Dashboard
GRAPH_VERSION=v21.0
PRIVATE_REPLY_BUTTON_MODE=attempt   # attempt | text_only (legacy fallback flag)

# Core
BASE_URL=https://app.replivault.com
API_URL=https://api.replivault.com
MONGO_URI=
REDIS_URL=
JWT_SECRET=
ENCRYPTION_KEY=                # 32 bytes base64 — KMS-managed in prod

# Limits
RATE_LIMIT_DMS_PER_MIN_PER_IG=90
PRIVATE_REPLIES_PER_HOUR_PER_IG=700   # advisory; auto-throttle on 80002

# Billing
STRIPE_SECRET_KEY=             # or RAZORPAY_KEY_ID/SECRET
BILLING_WEBHOOK_SECRET=
SMTP_URL=                      # transactional email
```

## 3. Dependencies

| Area | Choice |
|---|---|
| API | express 4, @aws-sdk (KMS optional), helmet, cors, zod, jsonwebtoken, bcryptjs, bullmq, ioredis, mongoose 8, axios, pino |
| Workers | bullmq, ioredis, mongoose, axios (shared via packages/) |
| Web | react 18, react-router, @tanstack/react-query, zustand, tailwindcss, react-joyride, recharts, driver.js |
| Dev | typescript, tsx, vitest, supertest, mongodb-memory-server, eslint, prettier |

## 4. Ports & health

API :8080 (`/healthz` returns DB + Redis ping), Web :5173 (proxied in dev), workers headless with BullMQ job-level metrics exposed at :9090/metrics.
