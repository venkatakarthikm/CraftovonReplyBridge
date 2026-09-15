// apps/api/src/routes/analytics.routes.ts
// Analytics endpoints: overview, per-automation, CSV export
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { MessageLogModel, AutomationModel, UsageCounterModel, IgAccountModel } from '@replybridge/db';

const router = Router();
router.use(requireAuth);

/** GET /analytics/overview */
router.get('/overview', async (req, res, next) => {
  try {
    const { from, to } = req.query as { from?: string; to?: string };
    const userId = req.user!.sub;

    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 86400000);
    const toDate = to ? new Date(to) : new Date();

    // DMs today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [dmsSentToday, commentsMatchedToday, linkTapsToday] = await Promise.all([
      // These would normally aggregate over MessageLog for the user's automations
      // Simplified: use UsageCounter for the current month
      UsageCounterModel.aggregate([
        { $match: { userId, month: new Date().toISOString().slice(0, 7) } },
        { $group: { _id: null, total: { $sum: '$dmsSent' } } },
      ]).then((r) => r[0]?.total ?? 0),
      UsageCounterModel.aggregate([
        { $match: { userId, month: new Date().toISOString().slice(0, 7) } },
        { $group: { _id: null, total: { $sum: '$commentsMatched' } } },
      ]).then((r) => r[0]?.total ?? 0),
      UsageCounterModel.aggregate([
        { $match: { userId, month: new Date().toISOString().slice(0, 7) } },
        { $group: { _id: null, total: { $sum: '$linkTaps' } } },
      ]).then((r) => r[0]?.total ?? 0),
    ]);

    const activeAutomations = await AutomationModel.countDocuments({ userId, enabled: true });

    // Per-automation stats
    const byAutomation = await AutomationModel.find({ userId })
      .select('name stats')
      .lean();

    const totalDmsSent = byAutomation.reduce((a, b) => a + (b.stats?.dmsSent ?? 0), 0);
    const totalLinkTaps = byAutomation.reduce((a, b) => a + (b.stats?.linkTaps ?? 0), 0);
    const ctr = totalDmsSent ? `${Math.round((totalLinkTaps / totalDmsSent) * 100)}%` : '0%';

    // Recent messages (last 10)
    const userAccountIds = await IgAccountModel.find({ userId }).select('_id').lean();
    const automationIds = await AutomationModel.find({ userId }).select('_id').lean();
    const recentMessages = await MessageLogModel.find({
      automationId: { $in: automationIds.map((a) => a._id) },
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    res.json({
      data: {
        dmsSentToday,
        commentsMatchedToday,
        linkTapsToday,
        activeAutomations,
        totalDmsSent,
        totalLinkTaps,
        ctr,
        byAutomation: byAutomation.map((a) => ({
          name: a.name,
          commentsMatched: a.stats?.commentsMatched ?? 0,
          dmsSent: a.stats?.dmsSent ?? 0,
          linkTaps: a.stats?.linkTaps ?? 0,
        })),
        recentMessages,
        daily: [], // Placeholder — full implementation uses aggregation pipeline per day
      },
    });
  } catch (e) { next(e); }
});

/** GET /analytics/export.csv */
router.get('/export.csv', async (req, res, next) => {
  try {
    const userId = req.user!.sub;
    const automations = await AutomationModel.find({ userId }).select('name stats').lean();

    const rows = [
      'Automation Name,Comments Matched,DMs Sent,Link Taps,Errors',
      ...automations.map((a) =>
        `"${a.name}",${a.stats?.commentsMatched ?? 0},${a.stats?.dmsSent ?? 0},${a.stats?.linkTaps ?? 0},${a.stats?.errors ?? 0}`
      ),
    ];

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="replybridge-analytics.csv"');
    res.send(rows.join('\n'));
  } catch (e) { next(e); }
});

export default router;
