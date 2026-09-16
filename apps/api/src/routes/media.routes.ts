// apps/api/src/routes/media.routes.ts
import { Router } from 'express';
import pino from 'pino';
import { Types } from 'mongoose';
import { MediaModel, CommentEventModel, IgAccountModel, UserModel, AutomationModel } from '@replybridge/db';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/errors.js';
import { backfillMediaSync } from '../services/backfill.service.js';

const router = Router();
const logger = pino({ name: 'media' });
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

    const filter: Record<string, unknown> = { igAccountId: account._id };
    if (type) filter['type'] = type;

    const $and: Record<string, unknown>[] = [];

    if (search) {
      const matchedAutomations = await AutomationModel.find({
        igAccountId: account._id,
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { 'link.url': { $regex: search, $options: 'i' } }
        ]
      }).select('mediaId').lean();
      
      $and.push({
        $or: [
          { caption: { $regex: search, $options: 'i' } },
          { mediaId: { $in: matchedAutomations.map(a => a.mediaId) } }
        ]
      });
    }

    if (automated === 'active' || automated === 'inactive') {
      const matchingStatus = await AutomationModel.find({
        igAccountId: account._id,
        enabled: automated === 'active'
      }).select('mediaId').lean();
      
      $and.push({ mediaId: { $in: matchingStatus.map(a => a.mediaId) } });
    } else if (automated === 'none') {
      const allAutomations = await AutomationModel.find({ igAccountId: account._id }).select('mediaId').lean();
      $and.push({ mediaId: { $nin: allAutomations.map(a => a.mediaId) } });
    }

    if (cursor) {
      const [cursorDate, cursorId] = cursor.split('_');
      // For custom sorting, cursor is different, but for simplicity we assume cursor is always date-based or we skip cursor on custom sorts for now
      if (sort === 'postedAt') {
        $and.push({
          $or: [
            { postedAt: { $lt: new Date(cursorDate ?? '') } },
            { postedAt: new Date(cursorDate ?? ''), _id: { $lt: new Types.ObjectId(cursorId ?? '') } },
          ]
        });
      }
    }

    if ($and.length > 0) {
      filter['$and'] = $and;
    }

    const sortField = sort === 'postedAt' ? 'postedAt' : `insights.${sort}`;
    const sortObj: Record<string, 1 | -1> = { [sortField]: -1 };
    if (sortField !== '_id') sortObj['_id'] = -1;

    const items = await MediaModel.find(filter)
      .sort(sortObj)
      .limit(Math.min(Number(limit), 100))
      .lean();

    // Attach automation to media items so UI knows exact status

    if (items.length > 0) {
      const mediaIds = items.map(item => item.mediaId);
      const automations = await AutomationModel.find({ mediaId: { $in: mediaIds } }).lean();
      
      for (const item of items) {
        const automation = automations.find(a => a.mediaId === item.mediaId);
        if (automation) {
          (item as any).automation = automation; // Attach full automation object
          (item as any).automationId = automation._id;
        }
      }
    }

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
      const syncResult = await backfillMediaSync(String(account._id), account.igId);
      
      // Update checklist
      await UserModel.updateOne(
        { _id: req.user!.sub },
        { $addToSet: { 'onboarding.checklist': 'reels_imported' } }
      );

      const automations = await AutomationModel.find(
        { igAccountId: account._id, scope: 'media', enabled: true, 'backfill.enabled': true },
        '_id mediaId'
      );
      
      import('../queues/producers.js').then(async ({ enqueueCommentBackfill }) => {
        for (const a of automations) {
          if (a.mediaId) {
            await enqueueCommentBackfill(String(a._id), account.igId, a.mediaId, String(account._id));
          }
        }
      });

      res.json({ data: { message: 'Media synced successfully!', ...syncResult, automationsEnqueued: automations.length } });
    } catch (e) {
      logger.error({ e }, 'Failed to sync media from Instagram');
      throw new AppError(500, 'sync_error', 'Failed to pull reels from Instagram.');
    }
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
