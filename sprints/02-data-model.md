# 02 — MongoDB Data Model (Mongoose schemas)

All collections use `_id: ObjectId`, `createdAt`/`updatedAt` via timestamps. Multi-tenancy key: `userId` on every user-owned document.

## 1. `users`

```ts
{
  email: String,            // unique, lowercased
  passwordHash: String,     // bcrypt (12 rounds)
  name: String,
  role: 'owner' | 'admin' | 'member',   // workspace role
  plan: 'free' | 'starter' | 'pro' | 'agency',
  onboarding: { tourDone: Boolean, checklist: [String] },  // tour state (doc 06)
  lastLoginAt: Date,
  deletedAt: Date | null    // soft delete; purge job after 30 days (privacy policy §5)
}
```
**Indexes:** `{ email: 1 } unique`; TTL index `{ deletedAt: 1 }` → 30-day purge worker.

## 2. `igAccounts` — the tenant's connected Instagram professional account

```ts
{
  userId: ObjectId,
  igId: String,             // IG professional account numeric id (unique per user)
  username: String,         // @handle, denormalized for UI
  accountType: 'BUSINESS' | 'MEDIA_CREATOR',
  scopes: [String],         // granted: instagram_business_basic, _manage_comments, _manage_messages
  tokenCipher: String,      // AES-256-GCM envelope(accessToken) — never store plaintext
  tokenExpiresAt: Date,     // long-lived token validity (60 days; refreshed by cron)
  tokenRefreshedAt: Date,
  webhookSubscribed: Boolean,
  status: 'active' | 'token_expired' | 'revoked',
  settings: {
    autoRegisterNewMedia: Boolean,      // default true: new reels auto-appear in list
    defaultTriggerMode: 'any_comment' | 'keyword',
    defaultKeywords: [String],
  }
}
```
**Indexes:** `{ igId: 1 } unique`, `{ userId: 1 }`.
**Cache:** Redis `igacct:{igId}` (10 min TTL) used by the webhook hot path.

## 3. `media` — cached reels/posts per account

```ts
{
  igAccountId: ObjectId,
  igId: String,             // IG professional account id (denormalized for hot lookups)
  mediaId: String,          // IG media id — unique per account
  type: 'REEL' | 'POST' | 'CAROUSEL' | 'STORY' | 'LIVE',
  caption: String,
  permalink: String,
  thumbnailUrl: String,     // cached copy in object storage (CDN) to keep dashboard fast
  postedAt: Date,
  commentCount: Number,     // updated nightly / on webhook activity
  source: 'backfill' | 'auto',   // auto = first seen via webhook
  automationCount: Number   // denormalized counter for the reels list UI
}
```
**Indexes:** `{ igId: 1, mediaId: 1 } unique`, `{ igAccountId: 1, postedAt: -1 }` (reels list pagination).

## 4. `automations` — the core entity: per-reel or account-wide rule

```ts
{
  userId: ObjectId,
  igAccountId: ObjectId,
  scope: 'media' | 'account_default',
  mediaId: String | null,          // set when scope='media' (account_default: null)
  name: String,
  enabled: Boolean,                // the ON/OFF toggle
  trigger: {
    mode: 'any_comment' | 'keyword',
    keywords: [String],            // when mode='keyword'
    matchAs: 'contains' | 'exact'  // lowercase match
  },
  privateReply: {
    templateId: ObjectId | null,   // optional link into `templates`
    text: String                   // supports {{name}} {{handle}} variables
  },
  commentReply: {                  // public reply under the comment (optional)
    enabled: Boolean,
    text: String                   // "📩 check your DMs" style; also templated
  },
  followUp: {
    enabled: Boolean,              // second DM after user replies / taps
    delaySeconds: Number,          // default 5
    text: String,
    button: { type: 'postback', title: 'Get Link', payload: 'GET_LINK' }
  },
  link: {                          // DYNAMIC LINK — editable any time
    url: String,                   // X for reel A, Y for reel B, edited to Z later
    buttonTitle: String,           // "Open Link"
    history: [{ url: String, changedAt: Date, changedBy: ObjectId }]  // edit history
  },
  backfill: {
    enabled: Boolean,              // also answer comments on OLD comments of this reel
    lastBackfilledCommentAt: Date | null   // cursor for incremental backfill
  },
  stats: {
    commentsMatched: Number, dmsSent: Number, linkTaps: Number, errors: Number
  },
  version: Number                  // optimistic locking for concurrent edits
}
```
**Indexes:** `{ igAccountId: 1, scope: 1, mediaId: 1 }` — the webhook resolves `(igId→igAccountId, mediaId)` with one query; partial index `{ enabled: 1 }` filtered to `enabled: true` so the hot path scans only live rules. `stats` updated with `$inc` (no read-modify-write).

## 5. `commentEvents` — idempotency + audit for every webhook comment

```ts
{
  igId: String,
  commentId: String,        // unique per event — THE idempotency key
  mediaId: String,
  fromUserId: String,       // commenter's IG id
  fromUsername: String,
  text: String,
  parentCommentId: String | null,
  matched: Boolean,         // did an automation fire?
  automationId: ObjectId | null,
  skippedReason: 'no_automation' | 'disabled' | 'owner_self' | 'duplicate'
              | 'window_expired' | 'rate_limited' | 'backfill_off' | null
}
```
**Indexes:** `{ commentId: 1 } unique` (insert-first with `ordered:false` — duplicates throw `E11000` and are dropped), `{ igId: 1, createdAt: -1 }`. TTL index `{ createdAt: 1 }` → 180 days.

## 6. `messageLogs` — every outbound DM / comment reply

```ts
{
  igId: String, recipientId: String, automationId: ObjectId,
  commentId: String | null, type: 'private_reply' | 'follow_up_dm' | 'comment_reply' | 'dm_only_reply',
  payloadJson: Mixed,           // exactly what was POSTed (redacted tokens)
  graphMessageId: String | null,
  status: 'queued' | 'sent' | 'failed' | 'skipped',
  errorCode: Number | null,     // e.g. 80002 throttle
  errorBody: String,
  attempts: Number
}
```
**Indexes:** `{ igId: 1, createdAt: -1 }`, `{ automationId: 1, createdAt: -1 }` (analytics), TTL `{ createdAt: 1 }` → 180 days.

## 7. `conversationStates` — durable replacement for the legacy in-memory Map

```ts
{
  igId: String, participantId: String,     // compound unique
  sourceCommentId: String | null,          // null ⇒ DM-only conversation
  mediaId: String | null,
  stage: 'awaiting_user_reply' | 'sent_get_link' | 'completed' | 'closed',
  pendingAutomationId: ObjectId | null,
  lastInboundAt: Date, lastOutboundAt: Date
}
```
**Indexes:** `{ igId: 1, participantId: 1 } unique`; **TTL index `{ lastInboundAt: 1 }` → 86400 s** (state auto-expires with Meta's 24-hour messaging window; a `HUMAN_AGENT` tag flow, if approved later, would extend this to 7 days but is not required for v1).

## 8. `templates` — reusable reply copy

```ts
{ userId: ObjectId, kind: 'private_reply' | 'comment_reply' | 'dm_reply',
  name: String, body: String, isSystem: Boolean }   // system = our shipped library
```
**Indexes:** `{ userId: 1, kind: 1 }`. Seeded with 10+ ready-made templates (see `07-tutorials-content.md`).

## 9. `plans` / `subscriptions`

```ts
// plans (seeded): free | starter | pro | agency
{ key, priceMonthly, igAccountsLimit, mediaLimit, dmQuotaPerMonth, automationLimit, features: [String] }
// subscriptions
{ userId: ObjectId, planKey: String, provider: 'stripe' | 'razorpay',
  providerSubId: String, status: 'active'|'past_due'|'canceled', currentPeriodEnd: Date }
```
**Indexes:** `{ userId: 1 } unique` on subscriptions. Usage counters live in `usageCounters { userId, month, dmsSent, ... }` with unique `{ userId: 1, month: 1 }` and atomic `$inc`.

## 10. `auditLogs` & `webhookRaw`

`auditLogs { userId, action, targetType, targetId, before, after, ip, userAgent }` — every link edit, toggle, template change (index `{ userId: 1, createdAt: -1 }`).
`webhookRaw { igId, topic, payload, receivedAt }` with TTL 7 days — a replayable buffer for incident debugging.

## 11. Retention summary (feeds the Privacy Policy)

| Data | Retention |
|---|---|
| Comment text / commenter ids | 180 days (TTL) |
| Message logs | 180 days (TTL) |
| Raw webhook payloads | 7 days (TTL) |
| Conversation state | 24 h (TTL = messaging window) |
| Access tokens | Only encrypted; deleted on disconnect/revoke |
| User account | Soft-deleted on request, purged after 30 days |
