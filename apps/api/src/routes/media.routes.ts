// apps/api/src/routes/media.routes.ts
import { Router } from 'express';
import { Types } from 'mongoose';
import { MediaModel, CommentEventModel, IgAccountModel } from '@replybridge/db';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/errors.js';
import { enqueueBackfill } from '../queues/producers.js';

const router = Router();
router.use(requireAuth);

/** GET /media */
router.get('/', async (req, res, next) => {
  try {
    const { igAccountId, type, search, automated, sort = 'postedAt', cursor, limit = 25 } = req.query as Record<string, string>;

    // Verify account ownership
    const account = await IgAccountModel.findById(igAccountId);
    if (!account || String(account.userId) !== req.user!.sub) {
      throw new AppError(403, 'forbidden', 'Not your IG account');
    }

    const filter: Record<string, unknown> = { igAccountId };
    if (type) filter['type'] = type;
    if (search) filter['caption'] = { $regex: search, $options: 'i' };
    if (automated === 'on') filter['automationCount'] = { $gt: 0 };
    if (automated === 'off') filter['automationCount'] = 0;
    if (cursor) {
      const [cursorDate, cursorId] = cursor.split('_');
      filter['$or'] = [
        { postedAt: { $lt: new Date(cursorDate ?? '') } },
        { postedAt: new Date(cursorDate ?? ''), _id: { $lt: new Types.ObjectId(cursorId ?? '') } },
      ];
    }

    const items = await MediaModel.find(filter)
      .sort({ postedAt: -1, _id: -1 })
      .limit(Math.min(Number(limit), 100))
      .lean();

    const last = items[items.length - 1];
    const nextCursor = last && items.length === Number(limit)
      ? `${(last as { postedAt: Date }).postedAt.toISOString()}_${last._id}`
      : undefined;

    res.json({ data: items, meta: { nextCursor } });
  } catch (e) { next(e); }
});

/** GET /media/:mediaId */
router.get('/:mediaId', async (req, res, next) => {
  try {
    const media = await MediaModel.findOne({ mediaId: req.params['mediaId'] }).lean();
    if (!media) throw new AppError(404, 'not_found', 'Media not found');

    const account = await IgAccountModel.findById(media.igAccountId);
    if (!account || String(account.userId) !== req.user!.sub) {
      throw new AppError(403, 'forbidden', 'Not your media');
    }
    res.json({ data: media });
  } catch (e) { next(e); }
});

/** POST /media/sync — trigger immediate backfill */
router.post('/sync', async (req, res, next) => {
  try {
    const { igAccountId } = req.body as { igAccountId?: string };
    const account = await IgAccountModel.findById(igAccountId);
    if (!account || String(account.userId) !== req.user!.sub) {
      throw new AppError(403, 'forbidden', 'Not your IG account');
    }
    try {
      await enqueueBackfill(String(account._id), account.igId);
    } catch (e) {
      logger.error({ e }, 'Failed to enqueue backfill job (check Redis connection)');
      throw new AppError(500, 'queue_error', 'Failed to start sync. Is Redis running?');
    }
    res.json({ data: { message: 'Backfill enqueued' } });
  } catch (e) { next(e); }
});

/** GET /media/:mediaId/comments */
router.get('/:mediaId/comments', async (req, res, next) => {
  try {
    const { before, limit = 25 } = req.query as { before?: string; limit?: string };
    const filter: Record<string, unknown> = { mediaId: req.params['mediaId'] };
    if (before) filter['createdAt'] = { $lt: new Date(before) };

    const comments = await CommentEventModel.find(filter)
      .sort({ createdAt: -1 })
      .limit(Math.min(Number(limit), 100))
      .lean();

    res.json({ data: comments });
  } catch (e) { next(e); }
});

export default router;
