// apps/workers/src/commentWorker.ts
// The heart of the automation engine.
// Processes 'wf-events' queue: comment and messaging events.
// Implements all guards from 04-automation-flows.md §1.
// NEVER makes Graph API calls directly — enqueues dm-send jobs instead.
import { Worker, Queue, type Job } from 'bullmq';
import { Types } from 'mongoose';
import pino from 'pino';
import {
  AutomationModel,
  CommentEventModel,
  ConversationStateModel,
  MessageLogModel,
  IgAccountModel,
  UsageCounterModel,
  type IAutomation,
} from '@replybridge/db';
import { decrypt } from './services/crypto.js';

const logger = pino({ name: 'comment-worker' });
const REDIS_OPTS = { connection: { url: process.env['REDIS_URL'] ?? 'redis://localhost:6379' } };

// The 7-day private-reply window in milliseconds
// META-VERIFIED: Private replies only allowed within 7 days of comment
const SEVEN_DAYS_MS = 7 * 24 * 3600 * 1000;

let dmSendQueue: Queue | null = null;
function getDmQueue(): Queue {
  if (!dmSendQueue) {
    dmSendQueue = new Queue('dm-send', {
      ...REDIS_OPTS,
      defaultJobOptions: {
        removeOnComplete: 200,
        removeOnFail: 1000,
        attempts: 5,
        backoff: { type: 'exponential', delay: 30_000 },
      },
    });
  }
  return dmSendQueue;
}

export function startCommentWorker(): Worker {
  const worker = new Worker(
    'wf-events',
    async (job: Job) => {
      const { type } = job.data as { type: string };

      if (type === 'comment') {
        await processCommentEvent(job);
      } else if (type === 'inbound_message') {
        await processInboundMessage(job);
      } else if (type === 'postback') {
        await processPostback(job);
      }
    },
    { ...REDIS_OPTS, concurrency: 20 }
  );

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'wf-events job failed');
  });

  return worker;
}

// ─── Comment event processing ────────────────────────────────────────────────
async function processCommentEvent(job: Job): Promise<void> {
  const { igId, igAccountId, data } = job.data as {
    igId: string;
    igAccountId: string;
    data: {
      from: { id: string; username?: string };
      media: { id: string };
      id: string;
      text: string;
      timestamp: number;
      parent_id?: string;
    };
  };

  const commentId = data.id;
  const mediaId = data.media.id;
  const fromUserId = data.from.id;
  const fromUsername = data.from.username ?? '';
  const commentText = data.text ?? '';
  const commentAge = Date.now() - data.timestamp * 1000;

  // ── Guard 1: Idempotency — insert commentEvent or detect duplicate ────────
  // Using ordered:false + unique index on commentId: E11000 = duplicate
  let commentEvent: any = null;
  try {
    commentEvent = await CommentEventModel.create({
      igId,
      commentId,
      mediaId,
      fromUserId,
      fromUsername,
      text: commentText,
      parentCommentId: data.parent_id ?? null,
      matched: false,
      skippedReason: null,
    });
  } catch (e: unknown) {
    // E11000 = duplicate comment — already processed
    if ((e as { code?: number }).code === 11000) {
      logger.info({ commentId }, 'Duplicate comment event — skipped');
      return;
    }
    throw e;
  }

  // ── Guard 2: Automation lookup — per-media first, then account default ───
  const account = await IgAccountModel.findById(igAccountId);
  if (!account || account.status !== 'active') {
    await CommentEventModel.updateOne(
      { _id: commentEvent._id },
      { skippedReason: 'no_automation' }
    );
    return;
  }

  // Automation resolution order (04-automation-flows.md §5):
  // 1. Per-media automation for this specific reel
  // 2. Account-default automation
  let automation = await AutomationModel.findOne({
    igAccountId,
    scope: 'media',
    mediaId,
    enabled: true,
  });

  if (!automation) {
    automation = await AutomationModel.findOne({
      igAccountId,
      scope: 'account_default',
      enabled: true,
    });
  }

  if (!automation) {
    await CommentEventModel.updateOne(
      { _id: commentEvent._id },
      { skippedReason: 'no_automation' }
    );
    return;
  }

  // ── Guard 3: Disabled check (already filtered above by enabled:true) ─────

  // ── Guard 4: Owner self-comment ──────────────────────────────────────────
  if (fromUserId === igId) {
    await CommentEventModel.updateOne(
      { _id: commentEvent._id },
      { skippedReason: 'owner_self', automationId: automation._id }
    );
    logger.debug({ commentId }, 'Skipping owner self-comment');
    return;
  }

  // ── Guard 5: Trigger match ───────────────────────────────────────────────
  if (!triggerMatches(automation, commentText)) {
    await CommentEventModel.updateOne(
      { _id: commentEvent._id },
      { skippedReason: 'trigger_miss', automationId: automation._id }
    );
    return;
  }

  // ── Guard 6: 7-day private-reply window ──────────────────────────────────
  // META-VERIFIED: Private replies only within 7 days of comment timestamp
  if (commentAge > SEVEN_DAYS_MS) {
    await CommentEventModel.updateOne(
      { _id: commentEvent._id },
      { skippedReason: 'window_expired', automationId: automation._id, matched: true }
    );
    logger.info({ commentId, commentAge: `${Math.floor(commentAge / 86400000)}d` }, 'Comment too old — window expired');
    return;
  }

  // ── All guards passed: resolve template variables and enqueue DM ─────────
  const resolvedText = resolveVariables(automation.privateReply.text, {
    name: fromUsername.split('_')[0] ?? fromUsername,
    username: fromUsername,
    reelCaptionFirstLine: '', // filled by worker from media if needed
    link: automation.link.url,
  });

  // Create a message log entry (queued state)
  const logEntry = await MessageLogModel.create({
    igId,
    recipientId: fromUserId,
    automationId: automation._id,
    commentId,
    type: 'private_reply',
    payloadJson: { commentId, text: resolvedText },
    status: 'queued',
    attempts: 0,
  });

  // Mark comment as matched
  await CommentEventModel.updateOne(
    { _id: commentEvent._id },
    { matched: true, automationId: automation._id }
  );

  // Increment stats (atomic $inc — no race condition)
  await AutomationModel.updateOne(
    { _id: automation._id },
    { $inc: { 'stats.commentsMatched': 1 } }
  );

  // Increment usage counter
  const month = new Date().toISOString().slice(0, 7); // YYYY-MM
  await UsageCounterModel.updateOne(
    { userId: automation.userId, month },
    { $inc: { commentsMatched: 1 } },
    { upsert: true }
  );

  // Enqueue the actual DM send job (grouped by igId for rate limiting)
  await getDmQueue().add(
    'private-reply',
    {
      logId: String(logEntry._id),
      igId,
      igAccountId,
      commentId,
      fromUserId,
      fromUsername,
      automationId: String(automation._id),
      text: resolvedText,
      commentReply: automation.commentReply,
      followUp: automation.followUp,
    }
  );

  logger.info({ commentId, automationId: String(automation._id) }, 'Comment matched — DM enqueued');
}

// ─── Inbound message processing ──────────────────────────────────────────────
async function processInboundMessage(job: Job): Promise<void> {
  const { igId, igAccountId, data } = job.data as {
    igId: string;
    igAccountId: string;
    data: { sender: { id: string }; message?: { mid?: string; text?: string } };
  };

  const participantId = data.sender.id;
  if (participantId === igId) return; // echo — ignore

  // Look up durable conversation state
  const state = await ConversationStateModel.findOne({ igId, participantId });

  if (state?.stage === 'awaiting_user_reply') {
    const automation = await AutomationModel.findById(state.pendingAutomationId);
    if (!automation?.followUp.enabled) return;

    // Update conversation state
    await ConversationStateModel.updateOne(
      { _id: state._id },
      { stage: 'sent_get_link', lastInboundAt: new Date() }
    );

    // Enqueue follow-up DM (after delay)
    await getDmQueue().add(
      'follow-up',
      {
        igId,
        igAccountId,
        participantId,
        automationId: String(automation._id),
        text: resolveVariables(automation.followUp.text, { link: automation.link.url }),
        buttonTitle: automation.followUp.button.title,
        buttonPayload: automation.followUp.button.payload,
      },
      {
        delay: automation.followUp.delaySeconds * 1000,
      }
    );
  } else {
    // DM-only path: no prior conversation state
    // Update lastInboundAt so 24h TTL window resets
    await ConversationStateModel.updateOne(
      { igId, participantId },
      { lastInboundAt: new Date() },
      { upsert: false } // only update existing; don't create new from inbound alone
    );
  }
}

// ─── Postback processing ─────────────────────────────────────────────────────
async function processPostback(job: Job): Promise<void> {
  const { igId, igAccountId, data } = job.data as {
    igId: string;
    igAccountId: string;
    data: { sender: { id: string }; postback: { payload: string } };
  };

  const participantId = data.sender.id;
  const payload = data.postback.payload;

  if (payload !== 'GET_LINK') return;

  const state = await ConversationStateModel.findOne({ igId, participantId });
  if (!state || state.stage !== 'sent_get_link') return;

  const automation = await AutomationModel.findById(state.pendingAutomationId);
  if (!automation) return;

  // Send final link button
  await getDmQueue().add(
    'send-link',
    {
      igId,
      igAccountId,
      participantId,
      automationId: String(automation._id),
      linkUrl: automation.link.url,
      linkTitle: automation.link.buttonTitle,
    }
  );

  // Update state to completed
  await ConversationStateModel.updateOne(
    { _id: state._id },
    { stage: 'completed', lastOutboundAt: new Date() }
  );

  // Increment linkTaps counter
  await AutomationModel.updateOne(
    { _id: automation._id },
    { $inc: { 'stats.linkTaps': 1 } }
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function triggerMatches(automation: IAutomation, commentText: string): boolean {
  if (automation.trigger.mode === 'any_comment') return true;

  const text = commentText.toLowerCase();
  const keywords = automation.trigger.keywords.map((k: string) => k.toLowerCase());

  if (automation.trigger.matchAs === 'exact') {
    return keywords.some((k: string) => text === k);
  }
  // contains (default)
  return keywords.some((k: string) => text.includes(k));
}

function resolveVariables(
  template: string,
  vars: { name?: string; username?: string; reelCaptionFirstLine?: string; link?: string }
): string {
  return template
    .replace(/\{\{name\}\}/g, vars.name ?? '')
    .replace(/\{\{username\}\}/g, vars.username ?? '')
    .replace(/\{\{reel_caption_first_line\}\}/g, vars.reelCaptionFirstLine ?? '')
    .replace(/\{\{link\}\}/g, vars.link ?? '');
}

// Export for testing
export { triggerMatches, resolveVariables };


