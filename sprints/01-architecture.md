# 01 — System Architecture

## 1. High-level topology

```
                        ┌──────────────────────────────────────────────────┐
                        │                    CLOUD                          │
Meta Graph API ──webhook──▶ HTTPS LB / WAF ──▶ API Gateway (Express + TS)  │
                            │                    ├─ /webhook (raw-body,     │
                            │                    │   HMAC verify, ACK <1s)  │
                            │                    ├─ /api/v1/* (dashboard)    │
                            │                    └─ /oauth/instagram (OAuth) │
                            │                                                 │
                            │   ┌───────────────┐      ┌──────────────────┐   │
                            └──▶│ Redis (BullMQ)│─────▶│ Worker Fleet      │   │
                                │  queues:      │      │ - comment-worker  │   │
                                │  wf-events    │      │ - dm-worker       │   │
                                │  dm-send      │      │ - backfill-worker │   │
                                │  backfill     │      │ - token-refresher │   │
                                │  token-refresh│      └────────┬─────────┘   │
                                └───────────────┘               │             │
                                     ┌──────────────┐           │             │
                                     │ MongoDB Atlas│◀──────────┘             │
                                     │ (replica set)│                         │
                                     └──────────────┘                         │
 React SPA (Vite + TS + Tailwind) ──▶ CDN ──▶ API Gateway                      │
                        └──────────────────────────────────────────────────┘
```

## 2. Services (monorepo, single deployable initially)

| Service | Runtime | Responsibility |
|---|---|---|
| `api` | Node 20, Express, TS | Webhook intake, REST API, OAuth callbacks, billing webhooks |
| `workers` | Node 20, BullMQ | All Graph API calls (comments backfill, DM sends, token refresh) |
| `web` | Vite + React + TS + Tailwind + Zustand + React Query | Dashboard SPA, tours, help center |
| `infra` | Docker Compose / Terraform | Mongo (Atlas), Redis, object storage for media cache |

**Why workers, never send in the webhook handler:** Meta retries aggressively if the webhook responds slowly; all Graph API calls (private replies, DMs, comment replies, backfills) go through queues so the webhook ACKs in <50 ms and retries/timeouts are handled by BullMQ.

## 3. Webhook intake pipeline (critical path)

1. `POST /webhook` with **raw body** retained (`express.raw({ type: 'application/json' })`) for signature verification.
2. Verify `X-Hub-Signature-256` (HMAC-SHA256 of raw body with `META_APP_SECRET`). Fail → 401.
3. Resolve `entry[].id` (the IG professional account id) → look up `IgAccount` (cached in Redis, key `igacct:{igId}`, TTL 10 min).
4. ACK `200` immediately (before any processing).
5. Enqueue each event to Redis:
   - `changes[].field === 'comments'` → `wf-events` (job payload: comment event).
   - `entry[].messaging[]` (messages / postbacks / echoes) → `wf-events`.
   - Job dedupe: BullMQ `jobId = sha256(objectType + rawEventId + igId)` prevents Meta's at-least-once redelivery from double-sending DMs.
6. `wf-events` worker: load active Automation for `(igId, mediaId)`; run guard rails (dedupe, owner/self comment filter, 7-day window check, per-IG limiter); then enqueue `dm-send` jobs.

## 4. Queue design (BullMQ)

| Queue | Concurrency | Rate limit | Notes |
|---|---|---|---|
| `wf-events` | 20/instance | none (internal only) | Dedup + decision logic; enqueues send jobs |
| `dm-send` | 10/instance | **grouped per IG account: 90 msg/min** (limit: 100 calls/sec per IG account for text/link messages — Conversations API is 2 calls/sec) | Uses BullMQ `limiter: { groupKey: 'igId', max, duration }`; handles error **80002** (Instagram Business Use Case throttle) with exponential backoff up to 5 retries |
| `backfill` | 2/instance | 1 call/sec per IG | Fetches media list + comments via Graph API; creates `Media` docs and per-reel Automations on opt-in |
| `token-refresh` | 1 (cron daily 03:00 UTC) | — | Refreshes long-lived tokens ≥45 days old via `/refresh_access_token` (`grant_type=ig_refresh_token`); alerts user at <14 days validity |

**Latency targets:** webhook ACK < 50 ms p99; private reply dispatched < 1.5 s p95 from event receipt; dashboard API < 150 ms p95 (indexes in `02-data-model.md` + Redis-cached IG account + automation lookups).

## 5. Media (reel/post) cache & automation resolution

- `backfill` worker imports up to the last 100 media items per account (`GET /{igId}/media?fields=id,caption,media_type,media_product_type,permalink,thumbnail_url,timestamp`). New posts are also caught via the `comments` webhook (first comment on an unseen media auto-registers it as `auto=true`).
- Automation resolution order for a comment: **per-media automation** → **account default automation** (if `inherit: true`) → none. This lets a user set "any comment → send Link X" account-wide and override individual reels with Link Y / Link Z.

## 6. DM-only path (the "user DMs without commenting" case)

Inbound `messages` events are a **first-class trigger**, not a side effect: a DM Automation can be bound to a media (referral payload) or account-wide, and fires on any inbound DM. Conversation state is durable in Mongo (`ConversationState`) with a 24 h TTL index, replacing the legacy in-memory `Map` — that in-memory Map is exactly why the old bot kept DMing people who never commented again after one historical comment. See `04-automation-flows.md`.

## 7. Scaling & deployment

- Start: 1× `api` (2 vCPU), 1× `workers` (2 vCPU), Mongo Atlas M10, Redis (Upstash/ElastiCache). Horizontally scale workers; queues are shared via Redis.
- Stateless API behind LB; sticky sessions unnecessary (JWT).
- Blue/green deploys: webhook URL must stay stable — deploy behind the same domain, never change the `/webhook` path.

## 8. Environments & config

`.env` (see `11-repo-scaffold.md` for the full list): `META_APP_ID`, `META_APP_SECRET`, `META_APP_CONFIG_ID` (Business Login config), `WEBHOOK_VERIFY_TOKEN`, `ENCRYPTION_KEY` (32-byte, per-deployment, from KMS in prod), `MONGO_URI`, `REDIS_URL`, `JWT_SECRET`, `BASE_URL`. Secrets are never stored in Mongo plaintext — only the `IgAccount.tokenCipher`.
