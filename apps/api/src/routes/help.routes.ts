// apps/api/src/routes/help.routes.ts
// Help articles (from seed data)
import { Router } from 'express';
import { HelpArticleModel } from '@replybridge/db';
import { AppError } from '../middleware/errors.js';

const router = Router();

/** GET /help */
router.get('/', async (_req, res, next) => {
  try {
    const articles = await HelpArticleModel.find().sort({ category: 1, order: 1 }).lean();
    res.json({ data: articles });
  } catch (e) { next(e); }
});

/** GET /help/:slug */
router.get('/:slug', async (req, res, next) => {
  try {
    const article = await HelpArticleModel.findOne({ slug: req.params['slug'] });
    if (!article) throw new AppError(404, 'not_found', 'Article not found');
    res.json({ data: article });
  } catch (e) { next(e); }
});

export default router;
