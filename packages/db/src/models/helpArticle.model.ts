// packages/db/src/models/helpArticle.model.ts
// Seed content from 07-tutorials-content.md
import { Schema, model, Document } from 'mongoose';

export interface IHelpArticle extends Document {
  slug: string;
  title: string;
  bodyHtml: string;
  category: string;
  order: number;
}

const HelpArticleSchema = new Schema<IHelpArticle>({
  slug: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  bodyHtml: { type: String, required: true },
  category: { type: String, required: true },
  order: { type: Number, default: 0 },
});

HelpArticleSchema.index({ slug: 1 }, { unique: true });
HelpArticleSchema.index({ category: 1, order: 1 });

export const HelpArticleModel = model<IHelpArticle>('HelpArticle', HelpArticleSchema);
