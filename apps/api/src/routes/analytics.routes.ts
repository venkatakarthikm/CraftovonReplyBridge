// apps/api/src/routes/analytics.routes.ts
// Analytics endpoints: overview, per-automation, CSV export
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { MessageLogModel, AutomationModel, UsageCounterModel, IgAccountModel } from '@replybridge/db';
import { Types } from 'mongoose';

const router = Router();
router.use(requireAuth);

/** GET /analytics/overview */
router.get('/overview', async (req, res, next) => {
  try {
    const { from, to } = req.query as { from?: string; to?: string };
    const userId = new Types.ObjectId(req.user!.sub);

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

    // Daily Activity Aggregation (for chart)
    const dailyActivity = await MessageLogModel.aggregate([
      {
        $match: {
          automationId: { $in: automationIds.map((a) => a._id) },
          createdAt: { $gte: fromDate, $lte: toDate },
          status: 'sent', // Only count successfully sent logs
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          dmsSent: {
            $sum: { $cond: [{ $ne: ["$type", "link_tap"] }, 1, 0] }
          },
          linkTaps: {
            $sum: { $cond: [{ $eq: ["$type", "link_tap"] }, 1, 0] }
          },
        },
      },
    ]);

    // Build dense array of dates for the chart
    const dailyMap = new Map<string, { dmsSent: number; linkTaps: number }>();
    for (const day of dailyActivity) {
      dailyMap.set(day._id, { dmsSent: day.dmsSent, linkTaps: day.linkTaps });
    }

    const daysCount = Math.round((toDate.getTime() - fromDate.getTime()) / 86400000);
    const daily = Array.from({ length: daysCount }, (_, i) => {
      const d = new Date(toDate.getTime() - (daysCount - 1 - i) * 86400000);
      const key = d.toISOString().slice(0, 10);
      const stats = dailyMap.get(key) || { dmsSent: 0, linkTaps: 0 };
      return {
        date: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
        dmsSent: stats.dmsSent,
        linkTaps: stats.linkTaps,
      };
    });

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
        daily,
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
