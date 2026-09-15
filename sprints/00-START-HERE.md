# Replivault — Instagram Comment-to-DM Automation SaaS
## Master Bundle Index (hand this folder to the agentic AI)

**Product name (working):** Replivault — "Automate every reel's DMs, hands-free."
**Stack:** MERN (MongoDB + Express + React + Node), TypeScript throughout, BullMQ/Redis for job fan-out, per-tenant encrypted token vault.

### What this bundle contains

| # | File | Purpose |
|---|------|---------|
| 01 | `01-architecture.md` | Full system architecture, services, queue design, latency strategy |
| 02 | `02-data-model.md` | Every Mongo collection, fields, indexes, retention rules |
| 03 | `03-api-spec.md` | REST API contracts (all endpoints, payloads, errors) |
| 04 | `04-automation-flows.md` | Comment→DM state machine, DM-only path, backfill toggles, the "messages without commenting" fix |
| 05 | `05-security-rbac.md` | Auth, token encryption, RBAC, Meta compliance, rate-limit guards |
| 06 | `06-onboarding-tour.md` | Guided tour script, checklist, empty states, tooltips |
| 07 | `07-tutorials-content.md` | Help-center articles, video scripts, FAQ |
| 08 | `08-privacy-policy.md` | Production privacy policy (Meta App Review ready) |
| 09 | `09-terms-of-service.md` | Terms of Service + Fair Use |
| 10 | `10-meta-app-review.md` | Exact Meta App Review submission kit + webhook setup runbook |
| 11 | `11-repo-scaffold.md` | Monorepo folder structure, env vars, package list |
| 12 | `12-build-plan-phases.md` | Phased build order for the agentic AI with acceptance criteria |
| 13 | `13-agentic-ai-master-prompt.md` | The single mega-prompt to paste into a coding agent |

### Legacy code being migrated (already read and analyzed)

The owner's current self-hosted bot (`server.js`, `instagram.js`, ~300 lines) does:
1. Webhook GET verify (`hub.challenge`) + POST handler that returns 200 immediately.
2. On a `comments` webhook change: keyword match → `POST /{IG_ID}/messages` with `recipient: {comment_id}` (private reply), with an **experimental button template attempt** and text-only fallback → public `replyToComment` via `/{comment_id}/replies` → stores `{recipientId → commentId}` in an **in-memory Map** (`pendingRequests`).
3. On the user's next inbound message: sends a "Get Link" postback button; on `GET_LINK` postback: sends the final `web_url` button with a single hardcoded `DESTINATION_LINK`.

**What the SaaS must change:** per-reel dynamic links, any-comment (not keyword) triggers, toggle per reel, old/new reel backfill, editable links + message copy, template library, multi-tenant auth, durable state (the in-memory Map is the root cause of repeat-DM bugs), analytics, billing, tours, legal pages.

### Verified platform facts used throughout this bundle (fetched this build)

| Fact | Value | Source |
|------|-------|--------|
| Business Login for Instagram scopes | `instagram_business_basic`, `instagram_business_content_publish`, `instagram_business_manage_messages`, `instagram_business_manage_comments` (legacy `business_*` scopes deprecated Jan 27, 2025) | [Meta — Business Login for Instagram](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/business-login) |
| Token exchange | auth code → short-lived token (`api.instagram.com/oauth/access_token`) → long-lived 60 days (`/access_token`, `grant_type=ig_exchange_token`); refresh via `/refresh_access_token`, `grant_type=ig_refresh_token`, token ≥24h old | same source |
| Private reply window | Must be sent within **7 days** of the comment; for Instagram **Live**, only during the broadcast | [Meta — Private replies](https://developers.facebook.com/documentation/instagram-platform/private-replies) |
| Send API rate limit | **100 calls/sec** per IG professional account for text/link/reaction/sticker messages; **10 calls/sec** for audio/video | [Meta — Rate limiting](https://developers.facebook.com/docs/graph-api/overview/rate-limiting) |
| Conversations API rate limit | **2 calls/sec** per IG professional account | same source |
| Throttle error | HTTP error with **code 80002** (Instagram Business Use Case limit) | same source |
| Webhook fields available | `comments`, `messages`, `message_echoes`, `messaging_postbacks`, `messaging_referral`, `message_reactions`, `messaging_seen`, `standby`, `messaging_optins`, `messaging_handover`, `messaging_policy_enforcement`, `response_feedback`, `story_insights`, `live_comments`, `mentions` | [Meta — Instagram webhooks](https://developers.facebook.com/documentation/instagram-platform/webhooks) |
| Webhook signature | Verify `X-Hub-Signature-256` = HMAC-SHA256 of raw body with the app secret; compare everything after `sha256=` | same source |

**Flagged for re-verification during build (do not hardcode from memory):**
- The exact 750 private-replies/hour figure came from the owner's own old README, not from a fetched Meta page. Treat as advisory; implement a configurable per-account limiter (default 700/hr) that reacts to error code 80002.
- The precise scope list the Messaging send endpoint requires for **App Review** (e.g. whether `instagram_business_manage_messages` alone suffices for the Instagram-Login path vs. Page-linked path) must be confirmed against the Messaging API doc page during Phase 0.
