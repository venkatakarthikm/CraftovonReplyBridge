// apps/api/src/routes/webhook.routes.ts
// CRITICAL PATH: webhook intake
// Must: verify HMAC-SHA256, ACK 200 < 50ms, dedupe events, enqueue to BullMQ
// MUST NOT: call Graph API here — all Graph calls go through workers
// META-VERIFIED: X-Hub-Signature-256 = "sha256=" + HMAC-SHA256(raw body, META_APP_SECRET)
import { Router, type Request, type Response } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';
import pino from 'pino';
import { env } from '../config/env.js';
import { enqueueWebhookEvent } from '../queues/producers.js';
import { WebhookRawModel, IgAccountModel } from '@replybridge/db';
import { Redis } from 'ioredis';

const router = Router();
const logger = pino({ name: 'webhook' });

// Redis for IG account cache (igacct:{igId} → JSON of IgAccount)
let _redis: Redis | null = null;
function getRedis(): Redis {
  if (!_redis) _redis = new Redis(env.REDIS_URL, { lazyConnect: true });
  return _redis;
}

/** GET /webhook — Meta hub verification */
router.get('/', (req: Request, res: Response): void => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === env.WEBHOOK_VERIFY_TOKEN) {
    logger.info('Webhook verified');
    res.status(200).send(String(challenge));
    return;
  }
  res.status(403).json({ error: { code: 'forbidden', message: 'Verification failed' } });
});

/**
 * POST /webhook — Meta webhook intake
 * Receives raw body (pre-parsed via express.raw in server.ts).
 * Hard latency target: ACK 200 < 50ms p99.
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const start = Date.now();

  // ── 1. HMAC-SHA256 signature verification ────────────────────────────────
  // META-VERIFIED: header = "sha256=" + hex(HMAC-SHA256(rawBody, appSecret))
  const signature = req.headers['x-hub-signature-256'] as string | undefined;
  if (!signature) {
    res.status(401).json({ error: { code: 'missing_signature', message: 'X-Hub-Signature-256 required' } });
    return;
  }

  const rawBody = req.body as Buffer;
  const expected = 'sha256=' + createHmac('sha256', env.META_APP_SECRET)
    .update(rawBody)
    .digest('hex');

  // Timing-safe comparison to prevent timing attacks
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    logger.warn({ signature }, 'Invalid webhook signature');
    res.status(401).json({ error: { code: 'invalid_signature', message: 'Signature mismatch' } });
    return;
  }

  // ── 2. ACK 200 immediately — BEFORE any processing ──────────────────────
  // This is the #1 rule: ACK fast, process async
  res.status(200).send('EVENT_RECEIVED');

  const elapsed = Date.now() - start;
  if (elapsed > 45) {
    logger.warn({ elapsed }, 'Webhook ACK nearing 50ms threshold');
  }

  // ── 3. Parse and enqueue asynchronously (non-blocking) ──────────────────
  try {
    const payload = JSON.parse(rawBody.toString('utf8')) as WebhookPayload;
    const redis = getRedis();

    for (const entry of payload.entry ?? []) {
      const igId = entry.id;

      // Resolve IgAccount from Redis cache (key: igacct:{igId})
      let igAccountId: string | null = null;
      const cached = await redis.get(`igacct:${igId}`);
      if (cached) {
        igAccountId = (JSON.parse(cached) as { _id: string })._id;
      } else {
        const acct = await IgAccountModel.findOne({ igId }).select('_id').lean();
        if (acct) {
          igAccountId = String(acct._id);
          // Cache for 10 min
          await redis.set(`igacct:${igId}`, JSON.stringify({ _id: igAccountId }), 'EX', 600);
        }
      }

      if (!igAccountId) {
        logger.warn({ igId }, 'Received webhook for unknown IG account — ignoring');
        continue;
      }

      // Persist raw payload for replay buffer (fire-and-forget)
      const topic = entry.changes?.[0]?.field ?? entry.messaging ? 'messages' : 'unknown';
      WebhookRawModel.create({
        igId,
        topic,
        payload: entry,
        receivedAt: new Date(),
      }).catch((e: unknown) => logger.error({ e }, 'Failed to persist webhookRaw'));

      // Enqueue comment change events
      for (const change of entry.changes ?? []) {
        if (change.field === 'comments') {
          await enqueueWebhookEvent({
            type: 'comment',
            igId,
            igAccountId,
            data: change.value as CommentChangeValue,
          });
        }
      }

      // Enqueue messaging events (messages, postbacks, echoes)
      for (const msg of entry.messaging ?? []) {
        if (msg.message && !msg.message.is_echo) {
          await enqueueWebhookEvent({
            type: 'inbound_message',
            igId,
            igAccountId,
            data: msg,
          });
        } else if (msg.postback) {
          await enqueueWebhookEvent({
            type: 'postback',
            igId,
            igAccountId,
            data: msg,
          });
        }
      }
    }
  } catch (e) {
    logger.error({ e }, 'Error processing webhook payload (already ACKed)');
  }
});

// ── Payload types ──────────────────────────────────────────────────────────
interface WebhookPayload {
  object: string;
  entry: WebhookEntry[];
}

interface WebhookEntry {
  id: string;
  time: number;
  changes?: Array<{ field: string; value: unknown }>;
  messaging?: WebhookMessage[];
}

interface WebhookMessage {
  sender: { id: string };
  recipient: { id: string };
  timestamp: number;
  message?: { mid: string; text?: string; is_echo?: boolean };
  postback?: { title: string; payload: string };
}

interface CommentChangeValue {
  from: { id: string; username?: string };
  media: { id: string };
  id: string;
  text: string;
  timestamp: number;
  parent_id?: string;
}

export default router;
