// packages/db/src/models/messageLog.model.ts
// 02-data-model.md §6 — messageLogs collection
import { Schema, model, Document, Types } from 'mongoose';

export interface IMessageLog extends Document {
  _id: Types.ObjectId;
  igId: string;
  recipientId: string;
  automationId: Types.ObjectId;
  commentId: string | null;
  type: 'private_reply' | 'follow_up_dm' | 'comment_reply' | 'dm_only_reply';
  payloadJson: Record<string, unknown>; // exactly what was POSTed (tokens redacted)
  graphMessageId: string | null;
  status: 'queued' | 'sent' | 'failed' | 'skipped';
  errorCode: number | null;       // e.g. 80002 throttle
  errorBody: string;
  attempts: number;
  createdAt: Date;
  updatedAt: Date;
}

const MessageLogSchema = new Schema<IMessageLog>(
  {
    igId: { type: String, required: true },
    recipientId: { type: String, required: true },
    automationId: {
      type: Schema.Types.ObjectId,
      ref: 'Automation',
      required: true,
    },
    commentId: { type: String, default: null },
    type: {
      type: String,
      enum: ['private_reply', 'follow_up_dm', 'comment_reply', 'dm_only_reply'],
      required: true,
    },
    payloadJson: { type: Schema.Types.Mixed, default: {} },
    graphMessageId: { type: String, default: null },
    status: {
      type: String,
      enum: ['queued', 'sent', 'failed', 'skipped'],
      default: 'queued',
    },
    errorCode: { type: Number, default: null },
    errorBody: { type: String, default: '' },
    attempts: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Indexes per 02-data-model.md
MessageLogSchema.index({ igId: 1, createdAt: -1 });
MessageLogSchema.index({ automationId: 1, createdAt: -1 }); // analytics
// TTL: retain 180 days
MessageLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 3600 });

export const MessageLogModel = model<IMessageLog>('MessageLog', MessageLogSchema);
