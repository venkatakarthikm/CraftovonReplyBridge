// packages/db/src/models/template.model.ts
// 02-data-model.md §8 — templates collection
import { Schema, model, Document, Types } from 'mongoose';

export interface ITemplate extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId | null; // null for system templates
  kind: 'private_reply' | 'comment_reply' | 'dm_reply';
  name: string;
  body: string;
  isSystem: boolean; // true = shipped library, cannot delete (only fork)
  createdAt: Date;
  updatedAt: Date;
}

const TemplateSchema = new Schema<ITemplate>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    kind: {
      type: String,
      enum: ['private_reply', 'comment_reply', 'dm_reply'],
      required: true,
    },
    name: { type: String, required: true, trim: true },
    body: { type: String, required: true },
    isSystem: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Indexes per 02-data-model.md
TemplateSchema.index({ userId: 1, kind: 1 });

export const TemplateModel = model<ITemplate>('Template', TemplateSchema);
