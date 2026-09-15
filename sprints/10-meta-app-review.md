# 10 — Meta App Review Submission Kit + Webhook Runbook

## 1. What the SaaS must request from Meta

**App type:** Business. Products: Instagram (API with Instagram Login), Webhooks.

**Permissions (Business Login for Instagram scopes — verified against current docs):**
| Scope | Justification text for App Review |
|---|---|
| `instagram_business_basic` | "Read the connected professional account's profile and media to display the user's reels in our dashboard." |
| `instagram_business_manage_comments` | "Read comments on the user's media to detect trigger comments and (optionally) post a public reply nudging commenters to check their DMs." |
| `instagram_business_manage_messages` | "Send the private reply to commenters and follow-up messages with the user's link, via the official Messaging API." |

Legacy `business_*` scope names were deprecated Jan 27, 2025 — never submit those.

## 2. Before submitting — checklist

- [ ] Privacy Policy live at a public URL (`/privacy-policy`) — full copy in `08`.
- [ ] Terms of Service + data-deletion instructions live (`/terms`, `/data-deletion`) with the Meta Data Deletion Request Callback endpoint implemented.
- [ ] Business verification + app icon, category, contact email completed in App Dashboard.
- [ ] App operating in **Development mode** with your own IG account added as a Tester (test the entire flow end-to-end first).
- [ ] Webhook verified and subscribed to: `comments`, `messages`, `messaging_postbacks`, `message_echoes` (optionally `message_reactions`, `messaging_seen`).
- [ ] Test users' recorded demo: screen recording of the **full user journey** (see §3).

## 3. App Review demo video script (record exactly this)

1. Show the Replivault website → sign up → **Connect Instagram** → Meta consent screen listing the three permissions (do not blur it).
2. Dashboard: reels imported; pick one reel; set trigger "Any comment", private reply text, paste link; enable; also flip the "Answer old comments" toggle and show an old comment being answered.
3. From a second test account, comment on the reel → show the private reply arriving → reply with any word → "Get Link" button arrives → tap → final "Open Link" button → link opens.
4. Show the toggle being turned OFF and a comment then producing no DM; show a link being edited (X → Z) and a fresh comment receiving the new link.
5. Show `/privacy-policy` loading publicly.

## 4. Review answers (paste-ready)

- *"How does your app use this permission?"* — instagram_business_manage_messages: "We send a single private reply to a person who commented on our user's media, and follow-up messages containing the user's chosen link only after the person messages us (opening the 24-hour window). No bulk or unsolicited messaging."
- *"Do you comply with Platform Terms 3(d)/4?"* — No data resale, no data brokers, no AI training use; logs auto-expire (180 days); data deletion callback honored within 48 h.

## 5. Webhook runbook (ops)

1. Dashboard → Webhooks → Objects: **Instagram** → Callback URL `https://app.replivault.com/api/v1/webhook`, Verify Token `WEBHOOK_VERIFY_TOKEN`.
2. Subscribe fields per connected account (or via `POST /{igId}/subscribed_fields` during OAuth callback — implemented).
3. GET verification handled (echo `hub.challenge`); POST always ACK 200 fast, verify HMAC first.
4. Certificate: keep auto-renewing TLS (Let's Encrypt) — webhook breaks on expiry.
5. Redelivery is at-least-once: idempotency by `commentId` is mandatory (implemented in `commentEvents`).
6. App Review timelines vary (weeks); while in review, keep serving test users in Development mode.

## 6. Known platform constraints to honor (verified)

- Private replies: only within **7 days** of the comment; Live: only during the broadcast.
- Messaging after that: only within the **24-hour** window opened by the user's latest message.
- Rate limits: 100 calls/sec per IG professional account (text/links), 10/sec (audio/video), Conversations API 2 calls/sec; throttle surfaces as error code **80002**.
- Max 3 buttons per button-template message; types `postback` / `web_url`.
- The owner's old README's "750 private replies/hour" figure was **not** re-verified against current docs — implement as a configurable limiter (default 700/hr) that auto-throttles on 80002.
