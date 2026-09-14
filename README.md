# Instagram Comment-to-DM Automation (self-hosted, official API)

Flow: someone comments a keyword on your reel → they get a private reply →
a follow-up DM with a "Get Link" button → tapping it sends a final DM with
a button that opens your actual link.

This uses **only Meta's official Instagram Messaging API** — no scraping,
no unofficial bots. That's what keeps your account safe.

---

## 0. Prerequisites

- An **Instagram Professional account** (Business or Creator)
- The IG account linked to a **Facebook Page** (still required for API access as of 2026)
- A **Meta Developer account** at developers.facebook.com
- Node.js 18+ installed locally
- A way to expose your local server to the internet during setup (e.g. `ngrok`), since Meta needs a public HTTPS URL for webhooks

## 1. Create your Meta App

1. Go to developers.facebook.com → **My Apps** → **Create App** → type **Business**.
2. Add the **Instagram** product to the app.
3. Under Instagram → API setup, connect your Instagram professional account.
4. Generate a **Page Access Token** (or IG User access token, depending on which login flow you use) with these permissions:
   - `instagram_manage_comments`
   - `instagram_manage_messages`
   - `pages_messaging`
   These require **App Review** for anyone besides you (as the developer/tester) to trigger them — while testing, add your own IG account as a Test User so you can try it before review is approved.

## 2. Install and configure this project

```bash
npm install
cp .env.example .env
```

Fill in `.env`:
- `PAGE_ACCESS_TOKEN` — from step 1
- `IG_ID` — your Instagram professional account's numeric ID (found in the API setup page)
- `VERIFY_TOKEN` — make up any random string, you'll reuse it in step 3
- `TRIGGER_KEYWORDS` — comma-separated words that trigger the flow (e.g. `link,price`)
- `DESTINATION_LINK` — the real URL you want to send

## 3. Run it and expose it

```bash
npm start
# in a second terminal:
ngrok http 3000
```

Copy the `https://xxxx.ngrok.app` URL ngrok gives you.

## 4. Register the webhook with Meta

In your Meta App dashboard → Webhooks → Instagram:
- Callback URL: `https://xxxx.ngrok.app/webhook`
- Verify token: the same `VERIFY_TOKEN` you put in `.env`
- Subscribe to these fields: `comments`, `messages`, `messaging_postbacks`

Meta will hit your `/webhook` GET endpoint once to confirm — if it returns
the challenge correctly (already handled in `server.js`), it turns green.

## 5. Test it

Comment your trigger keyword (e.g. "link") on one of your own reels from a
second test account. Within seconds you should get:
1. A private reply in your DM requests/inbox
2. A follow-up message with a "Get Link" button
3. After tapping it, a final message with an "Open Link" button

## Important limits to design around

- Private replies must be sent **within 7 days** of the comment (live videos: only during the broadcast)
- **750 private replies per hour** per account (rate limit)
- Buttons: max **3 per message**, types `postback` or `web_url` only
- Once your app is live for the public (not just test users), Meta requires **App Review** — expect to submit screen recordings of this exact flow

## Before going live: swap the in-memory Map

`pendingRequests` in `server.js` is just a demo placeholder. Replace it with
a real store (Redis, Postgres, etc.) if you need to track state across
server restarts or scale beyond a single process.

## Deploying

Any Node host works: Render, Railway, Fly.io, a small VPS. Just make sure:
- It serves HTTPS (Meta requires it)
- The `/webhook` path is publicly reachable
- Your `.env` secrets are set as environment variables, not committed to git
