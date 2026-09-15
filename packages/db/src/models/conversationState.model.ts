// packages/db/src/models/conversationState.model.ts
// 02-data-model.md §7 — conversationStates collection
// Durable replacement for the legacy in-memory Map. TTL = 24h (Meta's messaging window).
// When this document expires, no further messages can be sent to this participant.
import { Schema, model, Document, Types } from 'mongoose';

export interface IConversationState extends Document {
  _id: Types.ObjectId;
  igId: string;
  participantId: string;              // the commenter's IG user id
  sourceCommentId: string | null;     // null ⇒ DM-only conversation
  mediaId: string | null;
  stage:
    | 'awaiting_user_reply'
    | 'sent_get_link'
    | 'completed'
    | 'closed';
  pendingAutomationId: Types.ObjectId | null;
  lastInboundAt: Date;
  lastOutboundAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationStateSchema = new Schema<IConversationState>(
  {
    igId: { type: String, required: true },
    participantId: { type: String, required: true },
    sourceCommentId: { type: String, default: null },
    mediaId: { type: String, default: null },
    stage: {
      type: String,
      enum: ['awaiting_user_reply', 'sent_get_link', 'completed', 'closed'],
      default: 'awaiting_user_reply',
    },
    pendingAutomationId: {
      type: Schema.Types.ObjectId,
      ref: 'Automation',
      default: null,
    },
    lastInboundAt: { type: Date, required: true },
    lastOutboundAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// Indexes per 02-data-model.md
ConversationStateSchema.index({ igId: 1, participantId: 1 }, { unique: true });
// TTL index on lastInboundAt: 86400s (24h) — auto-expires with Meta's messaging window
// META-VERIFIED: Private reply window = 7 days for comments; 24h after user message opens window
ConversationStateSchema.index(
  { lastInboundAt: 1 },
  { expireAfterSeconds: 86400 }
);

export const ConversationStateModel = model<IConversationState>(
  'ConversationState',
  ConversationStateSchema
);
