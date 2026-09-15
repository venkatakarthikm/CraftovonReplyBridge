// apps/api/src/routes/templates.routes.ts
// Template CRUD with fork support
import { Router } from 'express';
import { TemplateModel } from '@replybridge/db';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/errors.js';

const router = Router();
router.use(requireAuth);

/** GET /templates — list system templates + user's own */
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user!.sub;
    const templates = await TemplateModel.find({
      $or: [{ userId }, { isSystem: true }],
    }).sort({ isSystem: -1, createdAt: -1 }).lean();
    res.json({ data: templates });
  } catch (e) { next(e); }
});

/** POST /templates — create user template */
router.post('/', async (req, res, next) => {
  try {
    const { name, body, kind } = req.body as { name: string; body: string; kind: string };
    if (!name || !body || !kind) throw new AppError(400, 'validation', 'name, body, kind required');
    const template = await TemplateModel.create({ userId: req.user!.sub, name, body, kind, isSystem: false });
    res.status(201).json({ data: template });
  } catch (e) { next(e); }
});

/** POST /templates/:id/fork — fork a system template */
router.post('/:id/fork', async (req, res, next) => {
  try {
    const source = await TemplateModel.findById(req.params['id']);
    if (!source) throw new AppError(404, 'not_found', 'Template not found');
    const forked = await TemplateModel.create({
      userId: req.user!.sub,
      name: `${source.name} (copy)`,
      body: source.body,
      kind: source.kind,
      isSystem: false,
    });
    res.status(201).json({ data: forked });
  } catch (e) { next(e); }
});

/** DELETE /templates/:id */
router.delete('/:id', async (req, res, next) => {
  try {
    const template = await TemplateModel.findById(req.params['id']);
    if (!template) throw new AppError(404, 'not_found', 'Template not found');
    if (template.isSystem) throw new AppError(403, 'forbidden', 'Cannot delete system templates — fork instead');
    if (String(template.userId) !== req.user!.sub) throw new AppError(403, 'forbidden', 'Not your template');
    await TemplateModel.deleteOne({ _id: template._id });
    res.json({ data: { message: 'Deleted' } });
  } catch (e) { next(e); }
});

export default router;
