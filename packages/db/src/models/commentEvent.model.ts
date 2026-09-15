// packages/db/src/models/commentEvent.model.ts
// 02-data-model.md §5 — commentEvents collection
// THE idempotency table: unique commentId prevents duplicate DMs from Meta at-least-once delivery
import { Schema, model, Document, Types } from 'mongoose';

export interface ICommentEvent extends Document {
  _id: Types.ObjectId;
  igId: string;
  commentId: string;          // THE idempotency key — unique index, E11000 = dedupe
  mediaId: string;
  fromUserId: string;
  fromUsername: string;
  text: string;
  parentCommentId: string | null;
  matched: boolean;
  automationId: Types.ObjectId | null;
  skippedReason:
    | 'no_automation'
    | 'disabled'
    | 'owner_self'
    | 'duplicate'
    | 'window_expired'
    | 'rate_limited'
    | 'backfill_off'
    | 'trigger_miss'
    | null;
  createdAt: Date;
  updatedAt: Date;
}

const CommentEventSchema = new Schema<ICommentEvent>(
  {
    igId: { type: String, required: true },
    commentId: { type: String, required: true },
    mediaId: { type: String, required: true },
    fromUserId: { type: String, required: true },
    fromUsername: { type: String, default: '' },
    text: { type: String, default: '' },
    parentCommentId: { type: String, default: null },
    matched: { type: Boolean, default: false },
    automationId: {
      type: Schema.Types.ObjectId,
      ref: 'Automation',
      default: null,
    },
    skippedReason: {
      type: String,
      enum: [
        'no_automation',
        'disabled',
        'owner_self',
        'duplicate',
        'window_expired',
        'rate_limited',
        'backfill_off',
        'trigger_miss',
        null,
      ],
      default: null,
    },
  },
  { timestamps: true }
);

// Indexes per 02-data-model.md
// unique commentId: insert with ordered:false — E11000 duplicates are silently dropped
CommentEventSchema.index({ commentId: 1 }, { unique: true });
CommentEventSchema.index({ igId: 1, createdAt: -1 });
// TTL: retain 180 days
CommentEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 3600 });

export const CommentEventModel = model<ICommentEvent>('CommentEvent', CommentEventSchema);
