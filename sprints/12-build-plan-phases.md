# 12 — Phased Build Plan (for the agentic AI) with acceptance criteria

## Phase 0 — Recon (30 min)
- Confirm against live Meta docs (do not trust memory): Messaging API required scopes for the Instagram-Login path, private-reply constraints, webhook `comments` payload shape. Update `00-START-HERE.md` "flagged" list with findings.
- **AC:** doc updated; open questions listed.

## Phase 1 — Monorepo + DB foundation
- Scaffold per `11-repo-scaffold.md`; implement all Mongoose models from `02-data-model.md` with every listed index; seed `plans` and system `templates` (doc 07).
- **AC:** `npm run seed` creates plans + 10 templates; index list verified via `collection.getIndexes()`.

## Phase 2 — Auth + RBAC
- Register/login/refresh/logout/forgot-password; RBAC middleware; audit logs on mutations.
- **AC:** member cannot call billing endpoints (403); every automation PATCH writes an auditLog.

## Phase 3 — Instagram OAuth + token vault
- `/instagram/authorize` → consent → callback: code→short-lived→long-lived exchange, AES-256-GCM encryption, `igAccounts` upsert, webhook `subscribed_fields` subscription, trigger backfill.
- **AC:** connecting a real (test) IG account imports ≤100 media; token stored only as cipher; disconnect deletes cipher + pauses automations.

## Phase 4 — Webhook intake + queues
- Raw-body HMAC verify, ACK <50 ms, dedupe jobIds, `webhookRaw` persistence, BullMQ queues with grouped limiter.
- **AC:** simulated webhook storm (10× same comment) produces exactly one private-reply job (idempotency); replayed webhook with bad signature → 401.

## Phase 5 — Automation engine
- Comment pipeline guards (doc 04 §1), private reply (attempt-button → text fallback), public comment reply, conversationStates, follow-up + postback GET_LINK + final web_url button with per-reel `link.url`.
- **AC:** integration test with a stubbed Graph client covers: any-comment match, keyword miss, duplicate comment, 7-day-expired comment (skipped), owner self-comment (skipped), throttle 80002 (retried, then failed + alert), postback flow sends the edited link.

## Phase 6 — Backfill + toggles
- Old-reels import; per-automation "answer old comments" with cursor; auto-registration of new media; account-default automation with per-media override.
- **AC:** enabling backfill processes history and marks >7-day comments `window_expired` without sending; disabling a reel's toggle stops DMs within seconds.

## Phase 7 — Dashboard SPA + tours
- All screens from doc 06 §3; onboarding checklist; Joyride tour with the verbatim tooltips; empty/error states; link edit with history UI.
- **AC:** fresh user can register→connect→activate a flow in <5 min using only in-app guidance.

## Phase 8 — Analytics, inbox, billing
- Aggregations off `messageLogs`/`commentEvents` (`$inc` counters maintained live); CSV export; Stripe/Razorpay checkout + webhooks; usage quota enforcement.
- **AC:** free-plan user blocked from connecting a 2nd IG account with upgrade prompt; analytics endpoint <150 ms p95 on 100k logs.

## Phase 9 — Legal + help center + polish
- Serve `08`/`09` copy at public URLs; data-deletion callback; help articles from doc 07; Meta App Review demo recording checklist from doc 10.
- **AC:** `/privacy-policy`, `/terms`, `/data-deletion` publicly reachable; App Review submission kit checked off.

## Phase 10 — Hardening + deploy
- Load test webhook intake (500 events/s), chaos test Redis restart (jobs resume), Mongo index audit (no COLLSCAN on hot paths), secret rotation runbook, blue/green deploy preserving `/webhook` path.
- **AC:** p99 webhook ACK <50 ms under load; zero duplicate DMs across a worker kill/resume.
