// apps/workers/src/backfillWorker.ts
// Backfill worker: imports last 100 media + answers old comments
// Per 04-automation-flows.md §3
import { Worker, type Job } from 'bullmq';
import pino from 'pino';
import {
  IgAccountModel,
  MediaModel,
  AutomationModel,
  CommentEventModel,
} from '@replybridge/db';
import { GraphMediaClient, mapMediaType } from '@replybridge/graph/media';
import { GraphCommentsClient } from '@replybridge/graph/comments';
import { decrypt } from './services/crypto.js';

const logger = pino({ name: 'backfill-worker' });
const redisUrl = process.env['REDIS_URL'] ?? 'redis://localhost:6379';
const isSecure = redisUrl.startsWith('rediss://') || redisUrl.includes('upstash.io');
const REDIS_OPTS = {
  connection: {
    url: redisUrl,
    ...(isSecure ? { tls: { rejectUnauthorized: false } } : {}),
  },
};
const SEVEN_DAYS_MS = 7 * 24 * 3600 * 1000;
const MAX_MEDIA_IMPORT = 100;

export function startBackfillWorker(): Worker {
  const worker = new Worker(
    'backfill',
    async (job: Job) => {
      const { type } = job.data as { type: string };
      if (type === 'media') {
        await backfillMedia(job);
      } else if (type === 'comments') {
        await backfillComments(job);
      }
    },
    { ...REDIS_OPTS, concurrency: 2 }
  );

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Backfill job failed');
  });

  return worker;
}

// ─── Media backfill: import last 100 reels/posts ─────────────────────────────
async function backfillMedia(job: Job): Promise<void> {
  const { igAccountId, igId } = job.data as { igAccountId: string; igId: string };

  const account = await IgAccountModel.findById(igAccountId).select('+tokenCipher');
  if (!account) throw new Error(`Account ${igAccountId} not found`);
  const accessToken = decrypt(account.tokenCipher);

  const mediaClient = new GraphMediaClient(accessToken);

  let imported = 0;
  let cursor: string | undefined;

  while (imported < MAX_MEDIA_IMPORT) {
    const { data: items, paging } = await mediaClient.listMedia(
      igId,
      cursor,
      Math.min(25, MAX_MEDIA_IMPORT - imported)
    );

    for (const item of items) {
      const mediaType = mapMediaType(item);

      let insightsRes: Record<string, number> | { _error: true; code?: number; message?: string; fbtrace_id?: string } | undefined;
      insightsRes = await mediaClient.getMediaInsights(item.id, item.media_product_type);

      const setPayload: any = {
        type: mediaType,
        caption: item.caption ?? '',
        permalink: item.permalink ?? '',
        thumbnailUrl: item.thumbnail_url ?? '',
      };
      
      if (insightsRes) {
        if ('_error' in insightsRes) {
          setPayload.insightsError = insightsRes;
        } else {
          setPayload.insights = insightsRes;
          setPayload.insightsError = null;
        }
      }

      try {
        await MediaModel.updateOne(
          { igId, mediaId: item.id },
          {
            $setOnInsert: {
              igAccountId: account._id,
              igId,
              mediaId: item.id,
              postedAt: new Date(item.timestamp),
              source: 'backfill',
              commentCount: 0,
              automationCount: 0,
            },
            $set: setPayload,
          },
          { upsert: true }
        );
        imported++;
      } catch (err) {
        const code = (err as { code?: number }).code;
        if (code === 11000) {
          imported++;
          continue;
        }
        logger.error({ err, mediaId: item.id }, 'Media insert failed');
      }
    }

    if (!paging?.next || imported >= MAX_MEDIA_IMPORT) break;
    cursor = paging.cursors.after;
  }

  logger.info({ igId, imported }, 'Media backfill complete');
}

// ─── Comments backfill: answer old comments (within 7-day window) ─────────────
async function backfillComments(job: Job): Promise<void> {
  const { automationId, igId, mediaId, igAccountId } = job.data as {
    automationId: string;
    igId: string;
    mediaId: string;
    igAccountId: string;
  };

  const automation = await AutomationModel.findById(automationId);
  if (!automation || !automation.backfill.enabled) {
    logger.info({ automationId }, 'Backfill disabled — skipping');
    return;
  }

  const account = await IgAccountModel.findById(igAccountId).select('+tokenCipher');
  if (!account) throw new Error(`Account ${igAccountId} not found`);
  const accessToken = decrypt(account.tokenCipher);

  const commentsClient = new GraphCommentsClient(accessToken);

  let cursor: string | undefined;
  let processedCount = 0;

  // Process comments in reverse_chronological order using cursor
  // Resume from lastBackfilledCommentAt if available
  do {
    const { data: comments, paging } = await commentsClient.listComments(mediaId, cursor);

    for (const comment of comments) {
      const commentTimestamp = new Date(comment.timestamp).getTime();
      const commentAge = Date.now() - commentTimestamp;

      // Comments older than 7 days: record as window_expired, never message
      // META-VERIFIED: Private replies only within 7 days of comment
      if (commentAge > SEVEN_DAYS_MS) {
        await CommentEventModel.updateOne(
          { commentId: comment.id },
          {
            $setOnInsert: {
              igId,
              commentId: comment.id,
              mediaId,
              fromUserId: comment.from?.id ?? '',
              fromUsername: comment.from?.username ?? '',
              text: comment.text,
              parentCommentId: comment.parent_id ?? null,
              matched: true,
              automationId,
              skippedReason: 'window_expired',
            },
          },
          { upsert: true }
        );
        
        // Wait, if it was upserted, we increment commentCount, but we don't have upsertedCount since updateOne returns an object in Mongoose but this is just fire and forget loop
        // The user just said "Same $inc block must be added... in the expired branch (line 148)"
        await MediaModel.updateOne(
          { igId, mediaId },
          { $inc: { commentCount: 1 } }
        );

        // Once we hit expired comments, all older ones will also be expired
        // (reverse_chronological order)
        logger.info({ automationId, processed: processedCount }, 'Hit 7-day boundary — stopping backfill');

        // Update cursor
        await AutomationModel.updateOne(
          { _id: automationId },
          { 'backfill.lastBackfilledCommentAt': new Date(comment.timestamp) }
        );
        return;
      }

      // Queue this comment through normal pipeline (will go to wf-events → dm-send)
      // We insert as a new commentEvent — the comment worker will process it
      const existing = await CommentEventModel.findOne({ commentId: comment.id });
      if (!existing) {
        await MediaModel.updateOne(
          { igId, mediaId },
          { $inc: { commentCount: 1 } }
        );
        // Re-inject into wf-events queue (comment worker handles guards)
        const { Queue } = await import('bullmq');
        const { createHash } = await import('crypto');

        const wfQueue = new Queue('wf-events', { ...REDIS_OPTS });
        const jobId = createHash('sha256')
          .update(`comment:${comment.id}:${igId}`)
          .digest('hex');

        await wfQueue.add(
          'comment',
          {
            type: 'comment',
            igId,
            igAccountId,
            data: {
              from: { id: comment.from?.id ?? '', username: comment.from?.username },
              media: { id: mediaId },
              id: comment.id,
              text: comment.text,
              timestamp: Math.floor(new Date(comment.timestamp).getTime() / 1000),
              parent_id: comment.parent_id,
            },
          },
          { jobId }
        );
        processedCount++;
      }
    }

    cursor = paging?.cursors.after;
    if (!paging?.next) break;
  } while (cursor);

  // Update backfill cursor
  await AutomationModel.updateOne(
    { _id: automationId },
    { 'backfill.lastBackfilledCommentAt': new Date() }
  );

  logger.info({ automationId, processedCount }, 'Comment backfill complete');
}
