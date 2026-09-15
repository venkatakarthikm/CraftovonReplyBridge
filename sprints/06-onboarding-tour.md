# 06 — Onboarding, Guided Tour & UX Design

## 1. First-run onboarding sequence (4 steps, < 5 minutes to first automation)

```
Step 1  REGISTER      email + password → email verification
Step 2  CONNECT IG    "Connect Instagram" → Meta Business Login consent
                      (scopes: instagram_business_basic, _manage_comments, _manage_messages)
Step 3  IMPORT REELS  auto-backfill runs; progress bar "Importing your last 100 posts…"
Step 4  FIRST FLOW    pick any reel → 3-question quick setup wizard:
                      (a) Trigger: ● Any comment  ○ Specific words
                      (b) Private reply text (prefilled from template library)
                      (c) Link to send (paste URL) → [Activate] → success confetti
```
The checklist card (`users.onboarding.checklist`: `register`, `connect_ig`, `reels_imported`, `first_automation`, `test_sent`) stays pinned on the dashboard until complete; completing all steps unlocks a 14-day Pro trial.

## 2. Guided product tour (in-app, driver.js / React Joyride)

| # | Target element | Tooltip copy (verbatim) |
|---|---|---|
| 1 | Reels grid | "Every reel and post on your account lives here. New posts appear automatically." |
| 2 | Toggle switch on a reel card | "Flip this to turn the automation for that reel ON or OFF — old and new reels both." |
| 3 | "Automation" button on a card | "Set the trigger, the DM text, and which link this reel sends. Each reel can send a different link." |
| 4 | Link field inside the editor | "Paste any URL here. Change it anytime — new comments instantly get the new link, no downtime." |
| 5 | "Answer old comments" switch | "Also reply to people who commented before you switched on. Comments older than 7 days can't be DM'd — that's an Instagram rule we can't bypass." |
| 6 | Templates tab | "Ready-made reply texts. Tap to use, edit freely." |
| 7 | Analytics tab | "See comments matched, DMs sent, and link taps for every reel." |
| 8 | Inbox tab | "Anyone currently mid-conversation. Nobody gets messaged without an open conversation — we never cold-DM." |

Tour state stored in `users.onboarding.tourDone`; "Replay tour" lives in the help menu.

## 3. Screens (React + Tailwind, professional layout: generous whitespace, consistent 24px section padding, clear vertical rhythm)

1. **Dashboard** — stat cards (DMs sent today / comments matched / link taps / active automations), checklist, recent activity feed.
2. **Reels** — grid of `media` cards: thumbnail, caption excerpt, posted date, automation badge (ON/OFF/Default), toggle, "Edit automation", comments count. Filters: All / Automated / Not automated; search by caption.
3. **Automation editor** (drawer or full page) — sections: Trigger → Private reply (+ template picker, `{{variable}}` chips) → Public comment reply toggle → Follow-up message + delay → **Link** (URL + button title + edit history) → Old-comments backfill toggle → Save/Test.
4. **Templates** — list, kind filter, system templates marked "Built-in".
5. **Inbox** — active conversations with stage badges (Awaiting reply / Link sent / Completed).
6. **Analytics** — range picker, line chart (DMs/day), table per automation with CTR.
7. **Settings** — connected account + token health banner ("Reconnect needed in 12 days"), default automation config, plan & billing, members (RBAC), danger zone (disconnect/delete).
8. **Help center** — tutorials (`07`), tour replay, status page link.
9. **Public** — landing page, `/pricing`, `/privacy-policy`, `/terms`, `/data-deletion`, `/help/*`.

## 4. Empty states & error copy

| State | Copy |
|---|---|
| No reels yet | "Connect finished — reels usually appear within a minute. [Refresh]" |
| Token expired | Red banner: "Instagram disconnected your account. Automation is paused. [Reconnect now]" |
| Throttle active | Amber badge: "Instagram is rate-limiting sends for this account. Queued messages will go out automatically." |
| Old comment skipped | Tooltip on skipped icon: "Older than 7 days — Instagram doesn't allow DMs for these." |
