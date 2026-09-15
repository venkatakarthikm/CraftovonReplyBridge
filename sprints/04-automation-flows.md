# 04 — Automation Flows (state machines)

## 1. Primary flow: comment → private reply → Get Link → destination

```
[comments webhook]
      │
      ▼
 ┌─────────────────────────┐   no     ┌──────────────────────────────┐
 │ Automation exists for    ├─────────▶│ record skippedReason=        │
 │ (igId, mediaId) & enabled│          │ no_automation / disabled     │
 └───────────┬─────────────┘          └──────────────────────────────┘
             │ yes
             ▼
 ┌─────────────────────────┐   no     ┌──────────────────────────────┐
 │ Trigger matches?         ├─────────▶│ skippedReason=trigger_miss   │
 │ (any_comment / keyword)  │          └──────────────────────────────┘
 └───────────┬─────────────┘
             │ yes
             ▼
 ┌──────────────────────────────────────────────────────────────────┐
 │ GUARDS (all must pass, else skippedReason set):                  │
 │  • idempotency: commentId already in commentEvents → duplicate   │
 │  • commenter ≠ account owner → owner_self                        │
 │  • comment age < 7 days → window_expired  (Private-reply rule)   │
 │  • per-IG limiter has headroom → rate_limited (re-queued)        │
 └───────────┬──────────────────────────────────────────────────────┘
             │ pass
             ▼
 [dm-send queue] POST /{igId}/messages
   recipient: { comment_id }  message: { text: privateReply.text }
             │
   success?  ├─ yes ──▶ stage=awaiting_user_reply  (conversationStates)
             │          optional public commentReply via /{commentId}/replies
             └─ no ───▶ log failure; if error 80002 → backoff retry
```

When the commenter then sends **any inbound message** (which opens the 24-hour messaging window):

```
[messages webhook: inbound, not echo]
      ▼
 look up conversationStates (igId, participantId)
      ├─ stage=awaiting_user_reply & followUp.enabled
      │        → after delaySeconds → send button template
      │          ("Get Link" postback) → stage=sent_get_link
      └─ stage null → DM-only path (§2)
```

Postback `GET_LINK` → send final button template with `web_url` button → `link.url` (per-reel dynamic link, editable any time) → `linkTaps++` → stage=completed.

**Legacy-code behavior carried over deliberately:** the old bot tried a button template *inside* the private reply and fell back to text-only on error. Keep this two-attempt strategy as a feature flag (`PRIVATE_REPLY_BUTTON_MODE=attempt|text_only`) since docs describe private replies as text-only, and the fallback guarantees delivery.

## 2. DM-only path (the "they never commented" case)

The owner observed users DMing the account **without any recent comment** — the old bot had only stale in-memory state, so those users were invisible or wrongly re-messaged. In the SaaS:

1. `conversationStates` is the single source of truth, with a **24 h TTL** (`lastInboundAt`). When it expires, no follow-up can fire — matching Meta's 24-hour window. Nothing is ever sent outside an open window; no stale Map, no repeats.
2. An **Inbound-DM automation** can be attached account-wide or to a media (via `messaging_referral` payload which carries the media the DM originated from): any inbound DM → optional auto-reply → optional link button → logged in `messageLogs` with `type=dm_only_reply`.
3. **Cold-DM suppression:** a user whose `conversationStates` is absent/`closed` never receives proactive DMs. The dashboard Inbox shows exactly who is mid-flow, so support can answer "why did X get a message?" in one lookup.

## 3. Backfill: old reels & old comments

Two toggles, both per automation:

| Toggle | Meaning | Implementation |
|---|---|---|
| **Cover old reels** (account-level opt-in) | Import existing media so they can be automated | `backfill` queue: `GET /{igId}/media?fields=...&limit=100` paginated → `media` docs with `source='backfill'`. New reels thereafter arrive via `auto=true` on first webhook comment |
| **Answer old comments** (`automations.backfill.enabled`) | Also private-reply to comments that already exist on this reel (within the 7-day rule) | Worker pages `GET /{mediaId}/comments?order=reverse_chronological` using `lastBackfilledCommentAt` as cursor; each historical comment re-enters the §1 pipeline. Comments older than 7 days are recorded with `skippedReason=window_expired` and **never messaged** — this is a hard Meta rule, surfaced honestly in the UI |
| New reels default | `settings.autoRegisterNewMedia=true` (default ON) | new reel appears in the list; automation is created manually per reel, or inherits the **account default automation** when `scope='account_default'` + per-media override exists |

## 4. Dynamic per-reel links with later edits

- Reel A → `https://x.link/a`; Reel B → `https://y.link/b`; user later edits Reel A to `https://z.link/new` → one `PATCH /automations/:id` writes `link.url` and appends `link.history`. All future sends use the new URL instantly (no deploy, no restart — this is why links live in Mongo, not env vars).
- The account-default automation lets "any comment on anything → default link" work with zero per-reel setup; per-reel automations override it.

## 5. Rate-limit & retry policy (per IG account)

- Grouped limiter: ≤ 90 text/link DMs/min (limit headroom: Meta allows 100 calls/sec per IG professional account for text/link messages, 10/sec for audio/video).
- On Graph error **80002** (Business Use Case throttle): exponential backoff 30 s → 2 m → 8 m → 30 m, max 5 attempts, then `status=failed` + user alert email + dashboard badge.
- Private replies are single-attempt per comment (idempotency key prevents dupes); a failed private reply never blocks the public comment reply.

## 6. Token lifecycle

Daily cron: tokens expiring in <15 days → `/refresh_access_token` (`grant_type=ig_refresh_token`, requires token ≥24 h old). Refresh failure → `status=token_expired` → automations paused, user emailed with a one-click reconnect (OAuth re-consent). Webhook deauthorization events (`/webhook` `field: 'mention'`-style removals or app deletion callbacks) mark `status=revoked`.
