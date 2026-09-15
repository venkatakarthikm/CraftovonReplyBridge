// packages/db/src/models/webhookRaw.model.ts
// 02-data-model.md §10 — webhookRaw collection
// Replayable buffer for incident debugging; TTL 7 days
import { Schema, model } from 'mongoose';

const WebhookRawSchema = new Schema(
  {
    igId: { type: String, required: true },
    topic: { type: String, required: true },   // 'comments' | 'messages' | etc.
    payload: { type: Schema.Types.Mixed, required: true },
    receivedAt: { type: Date, required: true },
  },
  { timestamps: false }
);

// TTL: retain 7 days
WebhookRawSchema.index({ receivedAt: 1 }, { expireAfterSeconds: 7 * 24 * 3600 });
WebhookRawSchema.index({ igId: 1, receivedAt: -1 });

export const WebhookRawModel = model('WebhookRaw', WebhookRawSchema);
