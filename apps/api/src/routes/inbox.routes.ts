// apps/api/src/routes/inbox.routes.ts
// Inbox: active ConversationState entries
import { Router } from 'express';
import { ConversationStateModel, IgAccountModel } from '@replybridge/db';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/errors.js';

const router = Router();
router.use(requireAuth);

/** GET /inbox */
router.get('/', async (req, res, next) => {
  try {
    const accounts = await IgAccountModel.find({ userId: req.user!.sub }).select('igId').lean();
    const igIds = accounts.map((a) => a.igId);
    const states = await ConversationStateModel.find({
      igId: { $in: igIds },
      stage: { $in: ['awaiting_user_reply', 'sent_get_link'] },
    }).sort({ lastInboundAt: -1 }).limit(100).lean();
    res.json({ data: states });
  } catch (e) { next(e); }
});

/** POST /inbox/:participantId/close */
router.post('/:participantId/close', async (req, res, next) => {
  try {
    const accounts = await IgAccountModel.find({ userId: req.user!.sub }).select('igId').lean();
    const igIds = accounts.map((a) => a.igId);
    const updated = await ConversationStateModel.updateMany(
      { igId: { $in: igIds }, participantId: req.params['participantId'] },
      { stage: 'closed' }
    );
    res.json({ data: { closed: updated.modifiedCount } });
  } catch (e) { next(e); }
});

export default router;
