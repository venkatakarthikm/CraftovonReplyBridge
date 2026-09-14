require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const {
  sendPrivateReply,
  sendPrivateReplyWithButton,
  sendGetLinkButton,
  sendFinalLinkButton,
  replyToComment,
} = require('./instagram');

const app = express();
app.use(bodyParser.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const TRIGGER_KEYWORDS = (process.env.TRIGGER_KEYWORDS || '')
  .split(',')
  .map((k) => k.trim().toLowerCase())
  .filter(Boolean);

// In-memory store just to remember "this recipient asked about which post/comment"
// Replace with a real database (Redis/Postgres/etc) before going to production.
const pendingRequests = new Map(); // recipientId -> { commentId, createdAt }

/**
 * Required by Meta before your app can go Live. A minimal, real privacy
 * policy describing what data this automation touches.
 */
app.get('/privacy-policy', (req, res) => {
  res.type('html').send(`
    <html>
      <head><title>Privacy Policy - Craftovon ReplyBridge</title></head>
      <body style="font-family: sans-serif; max-width: 640px; margin: 40px auto; line-height: 1.6;">
        <h1>Privacy Policy</h1>
        <p>Last updated: ${new Date().toISOString().slice(0, 10)}</p>
        <p>Craftovon ReplyBridge is an Instagram automation tool operated by Craftovon.
        It responds to comments on our own Instagram posts by sending the commenter
        a private reply and, if they request it, a direct message containing a link.</p>
        <h2>What we collect</h2>
        <p>We access the text of comments left on our Instagram posts, the commenter's
        Instagram user ID, and message events (button taps) needed to deliver the
        requested link via Instagram Direct.</p>
        <h2>How we use it</h2>
        <p>This data is used solely to detect trigger keywords in comments and to send
        the corresponding private reply and link. We do not sell or share this data
        with third parties, and do not use it for advertising.</p>
        <h2>Data retention</h2>
        <p>Comment and message data is processed to deliver the automated reply and is
        not stored beyond what is necessary for that purpose.</p>
        <h2>Contact</h2>
        <p>For questions or data deletion requests, contact: virat18mvk@gmail.com</p>
      </body>
    </html>
  `);
});

/**
 * STEP 0: Meta calls this once when you register your webhook in the App Dashboard.
 * It must echo back the "hub.challenge" value if the verify token matches.
 */
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook verified.');
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

/**
 * STEP 1-4: Meta POSTs every event here - comments AND message/postback events
 * both arrive on the same webhook URL, differentiated by the payload shape.
 */
app.post('/webhook', async (req, res) => {
  // Always respond 200 fast - Meta retries aggressively if you don't
  res.sendStatus(200);

  try {
    const body = req.body;
    if (body.object !== 'instagram') return;

    for (const entry of body.entry || []) {
      // --- Case A: someone commented on your reel/post ---
      for (const change of entry.changes || []) {
        if (change.field === 'comments') {
          await handleComment(change.value);
        }
      }

      // --- Case B: a message event (postback button tap, or plain reply) ---
      for (const messagingEvent of entry.messaging || []) {
        if (messagingEvent.postback) {
          await handlePostback(messagingEvent);
        } else if (messagingEvent.message && !messagingEvent.message.is_echo) {
          await handleIncomingMessage(messagingEvent);
        }
      }
    }
  } catch (err) {
    console.error('Error processing webhook event:', err.response?.data || err.message);
  }
});

async function handleComment(value) {
  const commentText = (value.text || '').toLowerCase();
  const commentId = value.id;
  const fromUserId = value.from?.id;

  const matchedKeyword = TRIGGER_KEYWORDS.find((kw) => commentText.includes(kw));
  if (!matchedKeyword) return; // not a trigger comment, ignore

  console.log(`Trigger keyword "${matchedKeyword}" matched on comment ${commentId}`);

  // EXPERIMENTAL: try sending the button directly as the private reply.
  // If Instagram rejects this, we'll fall back to text-only + wait-for-reply.
  let privateReplyRes;
  try {
    privateReplyRes = await sendPrivateReplyWithButton(
      commentId,
      "Thanks for commenting! 🙌 Hit the button below to get your link.",
      'Send me the link',
      'GET_LINK'
    );
    console.log('Private reply WITH BUTTON succeeded.');
  } catch (err) {
    console.error('Button-in-private-reply failed, falling back to text-only:', err.response?.data || err.message);
    privateReplyRes = await sendPrivateReply(
      commentId,
      "Thanks for commenting! 🙌 Reply with any message and I'll send your link right away."
    );
  }

  const recipientId = privateReplyRes?.recipient_id;
  if (!recipientId) {
    console.error('No recipient_id returned - cannot send follow-up button.');
    return;
  }

  // Publicly reply under the comment so they (and others) see a visible nudge
  try {
    await replyToComment(commentId, '📩 Check your DMs! We just sent you something.');
  } catch (err) {
    // Not fatal - the private reply already succeeded, so just log and continue
    console.error('Could not post public comment reply:', err.response?.data || err.message);
  }

  // Remember this so we know what to do once they reply (which opens the window)
  pendingRequests.set(recipientId, { commentId, createdAt: Date.now() });

  console.log(`Private reply sent to ${recipientId}. Waiting for their reply to open the messaging window.`);
}

async function handleIncomingMessage(messagingEvent) {
  const recipientId = messagingEvent.sender?.id;
  if (!recipientId || !pendingRequests.has(recipientId)) return; // not someone we're waiting on

  console.log(`${recipientId} replied - messaging window is now open. Sending button.`);

  // Window is open now, so this button message is allowed to go through
  await sendGetLinkButton(recipientId);
}

async function handlePostback(messagingEvent) {
  const recipientId = messagingEvent.sender?.id;
  const payload = messagingEvent.postback?.payload;

  if (payload !== 'GET_LINK') return; // not the button we care about

  console.log(`User ${recipientId} tapped "Get Link"`);

  // STEP 5: send the final message with the actual redirect button
  await sendFinalLinkButton(recipientId, process.env.DESTINATION_LINK);

  pendingRequests.delete(recipientId);
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Webhook server listening on port ${PORT}`);
});