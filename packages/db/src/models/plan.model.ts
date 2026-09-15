// packages/db/src/models/plan.model.ts
// 02-data-model.md §9 — plans collection (seeded)
import { Schema, model, Document } from 'mongoose';

export interface IPlan extends Document {
  key: 'free' | 'starter' | 'pro' | 'agency';
  priceMonthly: number;       // USD cents
  igAccountsLimit: number;
  mediaLimit: number;         // max media tracked
  dmQuotaPerMonth: number;
  automationLimit: number;
  features: string[];
}

const PlanSchema = new Schema<IPlan>({
  key: {
    type: String,
    enum: ['free', 'starter', 'pro', 'agency'],
    unique: true,
    required: true,
  },
  priceMonthly: { type: Number, required: true },
  igAccountsLimit: { type: Number, required: true },
  mediaLimit: { type: Number, required: true },
  dmQuotaPerMonth: { type: Number, required: true },
  automationLimit: { type: Number, required: true },
  features: { type: [String], default: [] },
});

export const PlanModel = model<IPlan>('Plan', PlanSchema);
