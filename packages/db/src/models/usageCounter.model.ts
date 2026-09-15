// packages/db/src/models/usageCounter.model.ts
// 02-data-model.md §9 — usageCounters (atomic $inc, no read-modify-write)
import { Schema, model, Document, Types } from 'mongoose';

const UsageCounterSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  month: { type: String, required: true }, // YYYY-MM format
  dmsSent: { type: Number, default: 0 },
  commentsMatched: { type: Number, default: 0 },
  linkTaps: { type: Number, default: 0 },
});

UsageCounterSchema.index({ userId: 1, month: 1 }, { unique: true });

export const UsageCounterModel = model('UsageCounter', UsageCounterSchema);
