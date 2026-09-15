// packages/db/src/models/subscription.model.ts
// 02-data-model.md §9 — subscriptions collection
import { Schema, model, Document, Types } from 'mongoose';

const SubscriptionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    planKey: { type: String, required: true },
    provider: { type: String, enum: ['stripe', 'razorpay'], required: true },
    providerSubId: { type: String, required: true },
    status: {
      type: String,
      enum: ['active', 'past_due', 'canceled', 'trialing'],
      default: 'active',
    },
    currentPeriodEnd: { type: Date, required: true },
    trialEnd: { type: Date, default: null },
  },
  { timestamps: true }
);

SubscriptionSchema.index({ userId: 1 }, { unique: true });

export const SubscriptionModel = model('Subscription', SubscriptionSchema);
