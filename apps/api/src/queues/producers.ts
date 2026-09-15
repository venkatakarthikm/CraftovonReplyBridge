// apps/api/src/queues/producers.ts
// BullMQ queue producers — only enqueue, never process here
// Workers (apps/workers/) handle all processing + Graph API calls
import { Queue } from 'bullmq';
import { createHash } from 'crypto';
import { env } from '../config/env.js';

const REDIS_OPTS = { connection: { url: env.REDIS_URL } };

// Queue instances (lazily created)
let _wfEventsQueue: Queue | null = null;
let _backfillQueue: Queue | null = null;
let _dmSendQueue: Queue | null = null;

export function getWfEventsQueue(): Queue {
  if (!_wfEventsQueue) {
    _wfEventsQueue = new Queue('wf-events', {
      ...REDIS_OPTS,
      defaultJobOptions: { removeOnComplete: 100, removeOnFail: 500 },
    });
  }
  return _wfEventsQueue;
}

export function getBackfillQueue(): Queue {
  if (!_backfillQueue) {
    _backfillQueue = new Queue('backfill', {
      ...REDIS_OPTS,
      defaultJobOptions: { removeOnComplete: 50, removeOnFail: 200 },
    });
  }
  return _backfillQueue;
}

export function getDmSendQueue(): Queue {
  if (!_dmSendQueue) {
    _dmSendQueue = new Queue('dm-send', {
      ...REDIS_OPTS,
      defaultJobOptions: {
        removeOnComplete: 200,
        removeOnFail: 1000,
        attempts: 5,
        backoff: { type: 'exponential', delay: 30_000 }, // 30s base for 80002 backoff
      },
    });
  }
  return _dmSendQueue;
}

export type WebhookEventJob =
  | { type: 'comment'; igId: string; igAccountId: string; data: unknown }
  | { type: 'inbound_message'; igId: string; igAccountId: string; data: unknown }
  | { type: 'postback'; igId: string; igAccountId: string; data: unknown };

/**
 * Enqueue a webhook event for processing.
 * jobId = sha256(type + rawEventId + igId) ensures exactly-once processing
 * even if Meta retries the same event (at-least-once delivery guarantee).
 */
export async function enqueueWebhookEvent(event: WebhookEventJob): Promise<void> {
  const rawId = getEventId(event);
  const jobId = createHash('sha256')
    .update(`${event.type}:${rawId}:${event.igId}`)
    .digest('hex');

  await getWfEventsQueue().add(event.type, event, {
    jobId, // BullMQ dedup: if jobId exists, job is silently skipped
  });
}

function getEventId(event: WebhookEventJob): string {
  const data = event.data as Record<string, unknown>;
  if (event.type === 'comment') return String(data['id'] ?? '');
  if (event.type === 'inbound_message') {
    const msg = data as { message?: { mid?: string } };
    return msg.message?.mid ?? '';
  }
  if (event.type === 'postback') {
    const msg = data as { message?: { mid?: string }; timestamp?: number };
    return msg.message?.mid ?? String(msg.timestamp ?? '');
  }
  return '';
}

/**
 * Enqueue a backfill job for a newly connected IG account.
 */
export async function enqueueBackfill(igAccountId: string, igId: string): Promise<void> {
  await getBackfillQueue().add(
    'backfill-media',
    { igAccountId, igId, type: 'media' },
    { jobId: `backfill-media:${igId}` }
  );
}

/**
 * Enqueue old-comments backfill for a specific automation.
 */
export async function enqueueCommentBackfill(
  automationId: string,
  igId: string,
  mediaId: string,
  igAccountId: string
): Promise<void> {
  await getBackfillQueue().add(
    'backfill-comments',
    { automationId, igId, mediaId, igAccountId, type: 'comments' },
    { jobId: `backfill-comments:${automationId}` }
  );
}
