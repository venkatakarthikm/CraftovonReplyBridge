// packages/db/src/models/igAccount.model.ts
// 02-data-model.md §2 — igAccounts collection
// META-VERIFIED: Scopes are instagram_business_basic, instagram_business_manage_comments,
//   instagram_business_manage_messages (legacy business_* deprecated Jan 27, 2025)
import { Schema, model, Document, Types } from 'mongoose';

export interface IIgAccount extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  igId: string;                 // IG professional account numeric id
  username: string;             // @handle, denormalized for UI
  accountType: 'BUSINESS' | 'MEDIA_CREATOR';
  scopes: string[];             // granted scopes
  tokenCipher: string;          // AES-256-GCM encrypted access token — NEVER plaintext
  tokenExpiresAt: Date;         // long-lived token validity (60 days)
  tokenRefreshedAt: Date;
  webhookSubscribed: boolean;
  status: 'active' | 'token_expired' | 'revoked';
  settings: {
    autoRegisterNewMedia: boolean;
    defaultTriggerMode: 'any_comment' | 'keyword';
    defaultKeywords: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

const IgAccountSchema = new Schema<IIgAccount>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    igId: { type: String, required: true },
    username: { type: String, required: true },
    accountType: {
      type: String,
      enum: ['BUSINESS', 'MEDIA_CREATOR'],
      required: true,
    },
    scopes: { type: [String], default: [] },
    tokenCipher: { type: String, required: true, select: false }, // never returned by default
    tokenExpiresAt: { type: Date, required: true },
    tokenRefreshedAt: { type: Date, required: true },
    webhookSubscribed: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['active', 'token_expired', 'revoked'],
      default: 'active',
    },
    settings: {
      autoRegisterNewMedia: { type: Boolean, default: true },
      defaultTriggerMode: {
        type: String,
        enum: ['any_comment', 'keyword'],
        default: 'any_comment',
      },
      defaultKeywords: { type: [String], default: [] },
    },
  },
  { timestamps: true }
);

// Indexes per 02-data-model.md
IgAccountSchema.index({ igId: 1 }, { unique: true });
IgAccountSchema.index({ userId: 1 });

export const IgAccountModel = model<IIgAccount>('IgAccount', IgAccountSchema);
