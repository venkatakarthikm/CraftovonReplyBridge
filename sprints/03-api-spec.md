# 03 — REST API Specification

Base URL: `https://api.replivault.com/api/v1` · Auth: `Authorization: Bearer <JWT>` (except webhook + OAuth). All responses `{ data, meta? }` or `{ error: { code, message, details? } }`. Standard errors: `400 validation`, `401 unauthenticated`, `403 forbidden`, `404 not_found`, `409 conflict` (version mismatch), `429 quota_exceeded`.

## 1. Auth

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/register` | `{ email, password, name }` → JWT + refresh cookie |
| POST | `/auth/login` | `{ email, password }` → JWT |
| POST | `/auth/refresh` | rotate refresh token |
| POST | `/auth/logout` | invalidate refresh |
| POST | `/auth/forgot-password` / `/auth/reset-password` | email flow |
| GET | `/auth/me` | profile + plan + onboarding checklist state |

## 2. Instagram connection (OAuth)

| Method | Path | Purpose |
|---|---|---|
| GET | `/instagram/authorize` | 302 → Meta authorization dialog. `redirect_uri=https://app.replivault.com/oauth/instagram/callback`, `scope=instagram_business_basic,instagram_business_manage_comments,instagram_business_manage_messages`, `state=<signed CSRF>` |
| GET | `/oauth/instagram/callback` | Exchanges `code` → short-lived token (`api.instagram.com/oauth/access_token`) → long-lived (`/access_token`, `grant_type=ig_exchange_token`). Encrypts token (AES-256-GCM), upserts `igAccounts`, triggers `backfill` queue, subscribes webhooks |
| GET | `/instagram/accounts` | connected account(s) + token health (`tokenExpiresAt`, status) |
| DELETE | `/instagram/accounts/:id` | disconnect: deauthorize, delete token, disable automations, mark `revoked` |
| POST | `/instagram/accounts/:id/refresh` | manual token refresh |

## 3. Media (reels list)

| Method | Path | Purpose |
|---|---|---|
| GET | `/media?igAccountId=&type=REEL&search=&automated=all|on|off&sort=postedAt&cursor=` | paginated reels list (cursor = postedAt+_id); `automated=off` is the "not yet automated" filter |
| GET | `/media/:mediaId` | single media + its automation summary |
| POST | `/media/sync` | enqueue immediate backfill (new posts import) |
| GET | `/media/:mediaId/comments?before=&limit=` | recent comments (from `commentEvents`) for preview |

## 4. Automations (the core CRUD)

| Method | Path | Purpose |
|---|---|---|
| GET | `/automations?igAccountId=&scope=media|account_default&enabled=` | list with stats |
| POST | `/automations` | body: `{ igAccountId, scope, mediaId?, name, trigger, privateReply, commentReply?, followUp?, link{url,buttonTitle}, backfill{enabled} }` |
| GET | `/automations/:id` | detail incl. link history + stats |
| PATCH | `/automations/:id` | partial update. `If-Match: <version>` header → `409` on stale edit. Link-only quick edit: `{ "link": { "url": "https://z.link/reelA" } }` appends to `link.history` |
| PATCH | `/automations/:id/toggle` | `{ enabled: Boolean }` — the ON/OFF switch |
| DELETE | `/automations/:id` | delete (commentEvents retained for audit) |
| POST | `/automations/:id/duplicate` | copy to another mediaId (fast setup for reel B) |
| POST | `/automations/:id/test` | sends a live test DM to the connected account owner (uses own account as commenter) |
| GET | `/automations/:id/messages?cursor=` | message log for this automation |

## 5. Templates

| Method | Path | Purpose |
|---|---|---|
| GET | `/templates?kind=&includeSystem=true` | user + system templates |
| POST | `/templates` | `{ kind, name, body }` |
| PATCH/DELETE | `/templates/:id` | edit/delete (system templates: fork-then-edit) |

Template variables: `{{name}}` (commenter first name), `{{username}}`, `{{reel_caption_first_line}}`, `{{link}}`. Validated server-side; unknown variables → 400.

## 6. Conversations / inbox (DM-only path visibility)

| Method | Path | Purpose |
|---|---|---|
| GET | `/inbox?igAccountId=&stage=&cursor=` | active conversation states (who's mid-flow) |
| POST | `/inbox/:participantId/close` | manual close (stops pending follow-ups) |

## 7. Analytics & billing

| Method | Path | Purpose |
|---|---|---|
| GET | `/analytics/overview?from=&to=` | comments matched, DMs sent, link taps, CTR, per-automation breakdown |
| GET | `/analytics/export.csv` | CSV export of messageLogs |
| GET | `/plans` | public plan catalog |
| GET | `/subscription` | current subscription + usage vs quota |
| POST | `/subscription/checkout` | provider session (Stripe/Razorpay) |
| POST | `/webhooks/billing` | provider webhook (signature-verified) |

## 8. Webhook endpoints (Meta-facing, no JWT)

| Method | Path | Purpose |
|---|---|---|
| GET | `/webhook` | hub verify: `hub.mode=subscribe` + `hub.verify_token === WEBHOOK_VERIFY_TOKEN` → echo `hub.challenge`; else 403 |
| POST | `/webhook` | raw-body HMAC verify (`X-Hub-Signature-256`) → persist `webhookRaw` → ACK 200 <50 ms → enqueue `wf-events` |

## 9. Legal & support pages (public, server-rendered)

`GET /privacy-policy` (must be a live public URL — Meta App Review requirement), `/terms`, `/data-deletion` (also handles Meta's data-deletion callback contract), `/help/:slug` (tutorials). All listed in `08`/`09`.

## 10. Pagination & rate-limit conventions

- Cursor pagination: `?cursor=<opaque>&limit=25` → `meta.nextCursor`. Max `limit=100`.
- Dashboard APIs are rate-limited per user: 120 req/min (429 with `Retry-After`).
- The DM send path (internal) is limited per IG account: 90 msg/min grouped limiter; reacts to Graph error code **80002** with exponential backoff (see `01-architecture.md` §4).
