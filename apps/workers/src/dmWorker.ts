// apps/workers/src/dmWorker.ts
// DM send worker: rate-limited per IG account (90 msg/min grouped limiter).
// Handles error 80002 (Business Use Case throttle) with exponential backoff.
// ALL Graph API calls live here — never in the webhook handler.
// Decrypts token here (only inside workers, per security spec).
import { Worker, type Job } from 'bullmq';
import pino from 'pino';
import {
  IgAccountModel,
  MessageLogModel,
  ConversationStateModel,
  AutomationModel,
  UsageCounterModel,
} from '@replybridge/db';
import { RealGraphMessagingClient } from '@replybridge/graph/messaging';
import { GraphCommentsClient } from '@replybridge/graph/comments';
import { getGraphErrorCode } from '@replybridge/graph';
import { decrypt } from './services/crypto.js';

const logger = pino({ name: 'dm-worker' });
const redisUrl = process.env['REDIS_URL'] ?? 'redis://localhost:6379';
const isSecure = redisUrl.startsWith('rediss://') || redisUrl.includes('upstash.io');
const REDIS_OPTS = {
  connection: {
    url: redisUrl,
    ...(isSecure ? { tls: { rejectUnauthorized: false } } : {}),
  },
};

// META-VERIFIED: Throttle error code = 80002
const THROTTLE_ERROR_CODE = 80002;

export function startDmWorker(): Worker {
  const worker = new Worker(
    'dm-send',
    async (job: Job) => {
      const { type: jobType } = job.name ? { type: job.name } : { type: 'private-reply' };

      if (job.name === 'private-reply') {
        await handlePrivateReply(job);
      } else if (job.name === 'follow-up') {
        await handleFollowUp(job);
      } else if (job.name === 'send-link') {
        await handleSendLink(job);
      }
    },
    {
      ...REDIS_OPTS,
      concurrency: 10,
      // Grouped rate limiter: 90 msg/min per IG account
      // META-VERIFIED: 100 calls/sec for text/link; we use 90/min (conservative)
      limiter: {
        max: 90,
        duration: 60_000,
      },
    }
  );

  worker.on('failed', async (job, err) => {
    logger.error({ jobId: job?.id, jobName: job?.name, err }, 'dm-send job failed');

    // On max retries exhausted, mark the message log as failed
    if (job && job.attemptsMade >= (job.opts.attempts ?? 5)) {
      const logId = (job.data as { logId?: string }).logId;
      if (logId) {
        await MessageLogModel.updateOne(
          { _id: logId },
          { status: 'failed', errorBody: String(err) }
        );
      }
      // Increment error counter
      const automationId = (job.data as { automationId?: string }).automationId;
      if (automationId) {
        await AutomationModel.updateOne({ _id: automationId }, { $inc: { 'stats.errors': 1 } });
      }
      // TODO Phase 8: send user alert email
    }
  });

  return worker;
}

// ─── Private reply handler ────────────────────────────────────────────────────
async function handlePrivateReply(job: Job): Promise<void> {
  const {
    logId, igId, igAccountId, commentId, fromUserId,
    fromUsername, automationId, text, commentReply, followUp,
  } = job.data as {
    logId: string;
    igId: string;
    igAccountId: string;
    commentId: string;
    fromUserId: string;
    fromUsername: string;
    automationId: string;
    text: string;
    commentReply: { enabled: boolean; text: string };
    followUp: { enabled: boolean };
  };

  // Decrypt token — ONLY inside workers
  const account = await IgAccountModel.findById(igAccountId).select('+tokenCipher');
  if (!account || account.status !== 'active') {
    throw new Error(`IG account ${igAccountId} not active`);
  }
  const accessToken = decrypt(account.tokenCipher);

  const msgClient = new RealGraphMessagingClient(accessToken, igId);

  try {
    await MessageLogModel.updateOne({ _id: logId }, { $inc: { attempts: 1 } });

    const { message_id, usedFallback } = await msgClient.sendPrivateReply(commentId, text);

    await MessageLogModel.updateOne(
      { _id: logId },
      { status: 'sent', graphMessageId: message_id }
    );

    // Increment DMs sent counter
    await AutomationModel.updateOne({ _id: automationId }, { $inc: { 'stats.dmsSent': 1 } });
    const month = new Date().toISOString().slice(0, 7);
    const automation = await AutomationModel.findById(automationId).select('userId');
    if (automation) {
      await UsageCounterModel.updateOne(
        { userId: automation.userId, month },
        { $inc: { dmsSent: 1 } },
        { upsert: true }
      );
    }

    logger.info({ commentId, message_id, usedFallback }, 'Private reply sent');

    // Upsert conversation state (replaces legacy in-memory Map)
    await ConversationStateModel.findOneAndUpdate(
      { igId, participantId: fromUserId },
      {
        igId,
        participantId: fromUserId,
        sourceCommentId: commentId,
        stage: 'awaiting_user_reply',
        pendingAutomationId: automationId,
        lastInboundAt: new Date(),
        lastOutboundAt: new Date(),
      },
      { upsert: true, new: true }
    );

    // Optional public comment reply (the "check your DMs" nudge)
    if (commentReply?.enabled && commentReply.text) {
      try {
        const commentsClient = new GraphCommentsClient(accessToken);
        await commentsClient.replyToComment(commentId, commentReply.text);
        logger.info({ commentId }, 'Public comment reply sent');
      } catch (e) {
        // Public reply failure is non-fatal; log and continue
        logger.warn({ e, commentId }, 'Public comment reply failed — not fatal');
      }
    }
  } catch (e: unknown) {
    const errorCode = getGraphErrorCode(e);
    const isThrottle = errorCode === THROTTLE_ERROR_CODE;

    await MessageLogModel.updateOne(
      { _id: logId },
      {
        status: isThrottle ? 'queued' : 'failed',
        errorCode,
        errorBody: String(e),
      }
    );

    logger.warn({ commentId, errorCode, isThrottle }, 'Private reply failed');

    // Re-throw so BullMQ can apply exponential backoff (30s → 2m → 8m → 30m → fail)
    throw e;
  }
}

// ─── Follow-up DM handler ────────────────────────────────────────────────────
async function handleFollowUp(job: Job): Promise<void> {
  const { igId, igAccountId, participantId, automationId, text, buttonTitle, buttonPayload } =
    job.data as {
      igId: string;
      igAccountId: string;
      participantId: string;
      automationId: string;
      text: string;
      buttonTitle: string;
      buttonPayload: string;
    };

  // Verify conversation state is still valid (not expired by 24h TTL)
  const state = await ConversationStateModel.findOne({ igId, participantId });
  if (!state || state.stage !== 'sent_get_link') {
    logger.info({ participantId }, 'Conversation state expired or changed — skip follow-up');
    return;
  }

  const account = await IgAccountModel.findById(igAccountId).select('+tokenCipher');
  if (!account) throw new Error('Account not found');
  const accessToken = decrypt(account.tokenCipher);

  const msgClient = new RealGraphMessagingClient(accessToken, igId);
  const { message_id } = await msgClient.sendGetLinkButton(participantId, text, buttonTitle, buttonPayload);

  await MessageLogModel.create({
    igId,
    recipientId: participantId,
    automationId,
    type: 'follow_up_dm',
    payloadJson: { text, buttonTitle, buttonPayload },
    graphMessageId: message_id,
    status: 'sent',
    attempts: 1,
  });

  logger.info({ participantId, message_id }, 'Follow-up DM sent');
}

// ─── Send link handler ────────────────────────────────────────────────────────
async function handleSendLink(job: Job): Promise<void> {
  const { igId, igAccountId, participantId, automationId, linkUrl, linkTitle } = job.data as {
    igId: string;
    igAccountId: string;
    participantId: string;
    automationId: string;
    linkUrl: string;
    linkTitle: string;
  };

  const account = await IgAccountModel.findById(igAccountId).select('+tokenCipher');
  if (!account) throw new Error('Account not found');
  const accessToken = decrypt(account.tokenCipher);

  const msgClient = new RealGraphMessagingClient(accessToken, igId);
  const { message_id } = await msgClient.sendLinkButton(
    participantId,
    'Here\'s your link! 🔗',
    linkUrl,
    linkTitle
  );

  await MessageLogModel.create({
    igId,
    recipientId: participantId,
    automationId,
    type: 'follow_up_dm',
    payloadJson: { linkUrl, linkTitle },
    graphMessageId: message_id,
    status: 'sent',
    attempts: 1,
  });

  // Increment link taps counter
  await AutomationModel.updateOne({ _id: automationId }, { $inc: { 'stats.linkTaps': 1 } });
  const month = new Date().toISOString().slice(0, 7);
  const automation = await AutomationModel.findById(automationId).select('userId');
  if (automation) {
    await UsageCounterModel.updateOne(
      { userId: automation.userId, month },
      { $inc: { linkTaps: 1 } },
      { upsert: true }
    );
  }

  logger.info({ participantId, message_id, linkUrl }, 'Link button sent');
}
