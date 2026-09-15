# 07 — Tutorial & Help-Center Content (seed content)

Seed as `helpArticles` collection (`slug`, `title`, `bodyHtml`, `category`, `order`) rendered at `/help/:slug`.

## Category: Getting started

**G1 — Connect your Instagram account (5 min)**
Requirements: Instagram **Professional** account (Business or Creator). Steps: Settings → Connections → Connect Instagram → Meta consent screen → approve the three permissions → reels import. Screenshot script: show consent screen, highlight each permission and explain it in one line (basic profile / read & reply to comments / send messages).
Video script (60 s): "Your reels, on autopilot. 1. Sign up. 2. Connect Instagram — approve the three permissions. 3. Pick a reel. 4. Paste your link. Done — everyone who comments gets your link in DMs, instantly."

**G2 — Set up your first reel automation**
Walkthrough of the 3-question wizard; explain trigger modes ("Any comment" vs "Specific words" with examples like *link, price, dm*); test with a second account; what arrives: private reply → (any reply from them) → Get Link button → your link.

**G3 — Sending different links on different reels**
Per-reel automations override the account default. Change a link anytime — edits apply to future sends immediately; history is kept in the activity log.

## Category: Automation rules

**A1 — Trigger keywords & matching** — case-insensitive contains vs exact; keywords like "link" also match "LINK please!!".
**A2 — Old comments & old reels** — what "Answer old comments" does; the 7-day rule (private replies must be sent within 7 days of the comment — older comments can never be DM'd; we mark them skipped instead of failing silently). Live-video comments can only be answered during the broadcast.
**A3 — The 24-hour DM window** — after your private reply, the commenter's next message opens a 24-hour window in which the Get Link button and link are delivered. If they never reply, the button step waits and expires safely; nothing is sent outside the window.
**A4 — Public comment replies** — the optional "📩 check your DMs" nudge and why it lifts reply rates.

## Category: Templates

**T1 — Template library** (seeded `isSystem: true`):
- *Link drop*: "Hey {{name}}! 👋 Thanks for commenting. Here's the link you asked for 👇"
- *Soft ask*: "Hi {{name}}, saw your comment on '{{reel_caption_first_line}}' — want the link? Just reply YES and it's yours!"
- *Support tone*: "Hey {{name}}! Thanks for reaching out — tap below and we'll take care of you."
- *Public nudge*: "📩 Check your DMs — sent you the link!"
- *Urgency*: "{{name}}, your link is ready ⏳ tap Get Link before it expires!"
Plus 5 more; all support `{{name}}`, `{{username}}`, `{{reel_caption_first_line}}`, `{{link}}`.

## Category: Troubleshooting

**TR1 — "My DMs stopped sending"** — token expired → reconnect; rate limit → automatic queue, no action needed; error codes explained in plain language (throttle code 80002 = Instagram asked us to slow down; we retry automatically).
**TR2 — "Someone got a message but never commented"** — they DM'd you directly, and your Inbound-DM automation replied. Shows how to turn that off (Settings → Default automation → Inbound DMs) and reassures: messages are only ever sent inside an open conversation window — never cold DMs.
**TR3 — "Comments from before today weren't answered"** — 7-day rule (see A2) + how to enable backfill before it's too late.
**TR4 — "Link button didn't arrive"** — commenter never replied after the private reply (window never opened); how the follow-up delay works.

## Category: Account & billing

**B1 — Plans & limits** (mirror the `plans` collection), **B2 — Disconnect & data deletion** (self-serve, 30-day purge), **B3 — Team members & roles**.
