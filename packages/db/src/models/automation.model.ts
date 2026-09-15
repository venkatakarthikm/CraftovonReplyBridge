// packages/db/src/models/automation.model.ts
// 02-data-model.md §4 — automations collection (the core entity)
import { Schema, model, Document, Types } from 'mongoose';

interface LinkHistoryEntry {
  url: string;
  changedAt: Date;
  changedBy: Types.ObjectId;
}

export interface IAutomation extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  igAccountId: Types.ObjectId;
  scope: 'media' | 'account_default';
  mediaId: string | null;
  name: string;
  enabled: boolean;
  trigger: {
    mode: 'any_comment' | 'keyword';
    keywords: string[];
    matchAs: 'contains' | 'exact';
  };
  privateReply: {
    templateId: Types.ObjectId | null;
    text: string;
  };
  commentReply: {
    enabled: boolean;
    text: string;
  };
  followUp: {
    enabled: boolean;
    delaySeconds: number;
    text: string;
    button: {
      type: 'postback';
      title: string;
      payload: string;
    };
  };
  link: {
    url: string;
    buttonTitle: string;
    history: LinkHistoryEntry[];
  };
  backfill: {
    enabled: boolean;
    lastBackfilledCommentAt: Date | null;
  };
  stats: {
    commentsMatched: number;
    dmsSent: number;
    linkTaps: number;
    errors: number;
  };
  version: number; // optimistic locking
  createdAt: Date;
  updatedAt: Date;
}

const AutomationSchema = new Schema<IAutomation>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    igAccountId: { type: Schema.Types.ObjectId, ref: 'IgAccount', required: true },
    scope: {
      type: String,
      enum: ['media', 'account_default'],
      required: true,
    },
    mediaId: { type: String, default: null },
    name: { type: String, required: true, trim: true },
    enabled: { type: Boolean, default: false },
    trigger: {
      mode: {
        type: String,
        enum: ['any_comment', 'keyword'],
        default: 'any_comment',
      },
      keywords: { type: [String], default: [] },
      matchAs: {
        type: String,
        enum: ['contains', 'exact'],
        default: 'contains',
      },
    },
    privateReply: {
      templateId: {
        type: Schema.Types.ObjectId,
        ref: 'Template',
        default: null,
      },
      text: { type: String, required: true },
    },
    commentReply: {
      enabled: { type: Boolean, default: false },
      text: { type: String, default: '' },
    },
    followUp: {
      enabled: { type: Boolean, default: false },
      delaySeconds: { type: Number, default: 5 },
      text: { type: String, default: '' },
      button: {
        type: { type: String, default: 'postback' },
        title: { type: String, default: 'Get Link' },
        payload: { type: String, default: 'GET_LINK' },
      },
    },
    link: {
      url: { type: String, required: true },
      buttonTitle: { type: String, default: 'Open Link' },
      history: [
        {
          url: { type: String, required: true },
          changedAt: { type: Date, required: true },
          changedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
          },
        },
      ],
    },
    backfill: {
      enabled: { type: Boolean, default: false },
      lastBackfilledCommentAt: { type: Date, default: null },
    },
    stats: {
      commentsMatched: { type: Number, default: 0 },
      dmsSent: { type: Number, default: 0 },
      linkTaps: { type: Number, default: 0 },
      errors: { type: Number, default: 0 },
    },
    version: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Indexes per 02-data-model.md
// Primary lookup: webhook resolves (igId→igAccountId, mediaId) in one query
AutomationSchema.index({ igAccountId: 1, scope: 1, mediaId: 1 });
// Partial index: hot path only scans enabled automations
AutomationSchema.index({ enabled: 1 }, { partialFilterExpression: { enabled: true } });
// User-scoped listing
AutomationSchema.index({ userId: 1, igAccountId: 1 });

export const AutomationModel = model<IAutomation>('Automation', AutomationSchema);
