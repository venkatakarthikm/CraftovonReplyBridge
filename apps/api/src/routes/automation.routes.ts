// apps/api/src/routes/automation.routes.ts
// Core CRUD for automations + toggle + duplicate + test
import { Router } from 'express';
import { Types } from 'mongoose';
import { AutomationModel, IgAccountModel, AuditLogModel, MessageLogModel, MediaModel, UserModel } from '@replybridge/db';
import { CreateAutomationSchema, PatchAutomationSchema, ToggleAutomationSchema } from '@replybridge/schemas';
import { requireAuth } from '../middleware/auth.js';
import { AppError, validate } from '../middleware/errors.js';
import { enqueueCommentBackfill } from '../queues/producers.js';

const router = Router();
router.use(requireAuth);

/** GET /automations */
router.get('/', async (req, res, next) => {
  try {
    const { igAccountId, scope, enabled, mediaId, cursor, limit = 25 } = req.query as Record<string, string>;
    const filter: Record<string, unknown> = { userId: req.user!.sub };
    if (igAccountId) filter['igAccountId'] = igAccountId;
    if (scope) filter['scope'] = scope;
    if (enabled !== undefined) filter['enabled'] = enabled === 'true';
    if (mediaId) filter['mediaId'] = mediaId;

    const automations = await AutomationModel.find(filter)
      .sort({ createdAt: -1 })
      .limit(Math.min(Number(limit) || 25, 100))
      .lean();

    res.json({ data: automations });
  } catch (e) { next(e); }
});

/** POST /automations */
router.post('/', async (req, res, next) => {
  try {
    const body = validate(CreateAutomationSchema, req.body);

    // Verify ownership of the IG account
    const account = await IgAccountModel.findById(body.igAccountId);
    if (!account || String(account.userId) !== req.user!.sub) {
      throw new AppError(403, 'forbidden', 'Not your IG account');
    }

    const automation = await AutomationModel.create({
      ...body,
      userId: req.user!.sub,
      igAccountId: body.igAccountId,
      link: {
        ...body.link,
        history: [
          { url: body.link.url, changedAt: new Date(), changedBy: new Types.ObjectId(req.user!.sub) },
        ],
      },
      version: 0,
    });

    await AuditLogModel.create({
      userId: req.user!.sub,
      action: 'automation.create',
      targetType: 'Automation',
      targetId: automation._id,
      after: automation.toObject(),
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    if (body.mediaId && automation.enabled) {
      await MediaModel.updateOne(
        { mediaId: body.mediaId, igAccountId: account._id },
        { $inc: { automationCount: 1 } }
      );
    }

    // If backfill enabled, enqueue immediately
    if (body.backfill?.enabled && body.mediaId) {
      await enqueueCommentBackfill(String(automation._id), account.igId, body.mediaId, String(account._id));
    }

    await UserModel.updateOne(
      { _id: req.user!.sub },
      { $addToSet: { 'onboarding.checklist': 'first_automation' } }
    );

    res.status(201).json({ data: automation });
  } catch (e) { next(e); }
});

/** GET /automations/:id */
router.get('/:id', async (req, res, next) => {
  try {
    const automation = await AutomationModel.findById(req.params['id']);
    if (!automation || String(automation.userId) !== req.user!.sub) {
      throw new AppError(404, 'not_found', 'Automation not found');
    }
    res.json({ data: automation });
  } catch (e) { next(e); }
});

/** PATCH /automations/:id — partial update with optimistic locking */
router.patch('/:id', async (req, res, next) => {
  try {
    const body = validate(PatchAutomationSchema, req.body);
    const automation = await AutomationModel.findById(req.params['id']);
    if (!automation || String(automation.userId) !== req.user!.sub) {
      throw new AppError(404, 'not_found', 'Automation not found');
    }

    // Optimistic locking via If-Match header or version field
    const clientVersion = body.version ?? Number(req.headers['if-match'] ?? -1);
    if (clientVersion >= 0 && clientVersion !== automation.version) {
      throw new AppError(409, 'version_conflict', 'Stale edit — reload and try again');
    }

    const before = automation.toObject();

    // Link edit: append to history
    if (body.link?.url && body.link.url !== automation.link.url) {
      automation.link.history.push({
        url: body.link.url,
        changedAt: new Date(),
        changedBy: new Types.ObjectId(req.user!.sub),
      });
    }

    Object.assign(automation, body);
    automation.version += 1;
    await automation.save();

    await AuditLogModel.create({
      userId: req.user!.sub,
      action: 'automation.patch',
      targetType: 'Automation',
      targetId: automation._id,
      before,
      after: automation.toObject(),
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ data: automation });
  } catch (e) { next(e); }
});

/** PATCH /automations/:id/toggle — ON/OFF switch */
router.patch('/:id/toggle', async (req, res, next) => {
  try {
    const { enabled } = validate(ToggleAutomationSchema, req.body);
    const automation = await AutomationModel.findById(req.params['id']);
    if (!automation || String(automation.userId) !== req.user!.sub) {
      throw new AppError(404, 'not_found', 'Automation not found');
    }
    const before = automation.toObject();
    automation.enabled = enabled;
    await automation.save();

    if (automation.mediaId) {
      await MediaModel.updateOne(
        { mediaId: automation.mediaId, igAccountId: automation.igAccountId },
        { $inc: { automationCount: enabled ? 1 : -1 } }
      );
    }

    await AuditLogModel.create({
      userId: req.user!.sub,
      action: `automation.${enabled ? 'enable' : 'disable'}`,
      targetType: 'Automation',
      targetId: automation._id,
      before,
      after: { enabled },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ data: { enabled: automation.enabled } });
  } catch (e) { next(e); }
});

/** DELETE /automations/:id */
router.delete('/:id', async (req, res, next) => {
  try {
    const automation = await AutomationModel.findById(req.params['id']);
    if (!automation || String(automation.userId) !== req.user!.sub) {
      throw new AppError(404, 'not_found', 'Automation not found');
    }
    await AutomationModel.deleteOne({ _id: automation._id });
    
    if (automation.mediaId && automation.enabled) {
      await MediaModel.updateOne(
        { mediaId: automation.mediaId, igAccountId: automation.igAccountId },
        { $inc: { automationCount: -1 } }
      );
    }
    await AuditLogModel.create({
      userId: req.user!.sub,
      action: 'automation.delete',
      targetType: 'Automation',
      targetId: automation._id,
      before: automation.toObject(),
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    res.json({ data: { message: 'Deleted' } });
  } catch (e) { next(e); }
});

/** POST /automations/:id/duplicate */
router.post('/:id/duplicate', async (req, res, next) => {
  try {
    const { mediaId } = req.body as { mediaId?: string };
    const source = await AutomationModel.findById(req.params['id']);
    if (!source || String(source.userId) !== req.user!.sub) {
      throw new AppError(404, 'not_found', 'Automation not found');
    }
    const dup = source.toObject() as unknown as Record<string, unknown>;
    delete dup['_id'];
    delete dup['createdAt'];
    delete dup['updatedAt'];
    (dup as Record<string, unknown>)['mediaId'] = mediaId ?? null;
    (dup as Record<string, unknown>)['name'] = `${source.name} (copy)`;
    (dup as Record<string, unknown>)['enabled'] = false;
    (dup as Record<string, unknown>)['version'] = 0;
    (dup as Record<string, unknown>)['stats'] = { commentsMatched: 0, dmsSent: 0, linkTaps: 0, errors: 0 };
    const created = await AutomationModel.create(dup);

    // Note: duplicated automations are created with enabled: false, so we do NOT increment the automationCount yet.
    // When the user toggles it ON, the toggle handler will increment it.

    res.status(201).json({ data: created });
  } catch (e) { next(e); }
});

/** GET /automations/:id/messages — message log for this automation */
router.get('/:id/messages', async (req, res, next) => {
  try {
    const automation = await AutomationModel.findById(req.params['id']);
    if (!automation || String(automation.userId) !== req.user!.sub) {
      throw new AppError(404, 'not_found', 'Automation not found');
    }
    const { cursor, limit = 25 } = req.query as { cursor?: string; limit?: string };
    const filter: Record<string, unknown> = { automationId: automation._id };
    if (cursor) filter['_id'] = { $lt: new Types.ObjectId(cursor) };

    const logs = await MessageLogModel.find(filter)
      .sort({ _id: -1 })
      .limit(Math.min(Number(limit), 100))
      .lean();

    const nextCursor = logs.length === Number(limit) ? String(logs[logs.length - 1]!['_id']) : undefined;
    res.json({ data: logs, meta: { nextCursor } });
  } catch (e) { next(e); }
});

export default router;
