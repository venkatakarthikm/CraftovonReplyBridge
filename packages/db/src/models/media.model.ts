// packages/db/src/models/media.model.ts
// 02-data-model.md §3 — media collection
import { Schema, model, Document, Types } from 'mongoose';

export interface IMedia extends Document {
  _id: Types.ObjectId;
  igAccountId: Types.ObjectId;
  igId: string;               // IG professional account id (denormalized)
  mediaId: string;            // IG media id — unique per account
  type: 'REEL' | 'POST' | 'CAROUSEL' | 'STORY' | 'LIVE';
  caption: string;
  permalink: string;
  thumbnailUrl: string;
  postedAt: Date;
  commentCount: number;
  source: 'backfill' | 'auto';  // auto = first seen via webhook
  automationCount: number;        // denormalized counter for reels list UI
  createdAt: Date;
  updatedAt: Date;
}

const MediaSchema = new Schema<IMedia>(
  {
    igAccountId: { type: Schema.Types.ObjectId, ref: 'IgAccount', required: true },
    igId: { type: String, required: true },
    mediaId: { type: String, required: true },
    type: {
      type: String,
      enum: ['REEL', 'POST', 'CAROUSEL', 'STORY', 'LIVE'],
      required: true,
    },
    caption: { type: String, default: '' },
    permalink: { type: String, default: '' },
    thumbnailUrl: { type: String, default: '' },
    postedAt: { type: Date, required: true },
    commentCount: { type: Number, default: 0 },
    source: {
      type: String,
      enum: ['backfill', 'auto'],
      default: 'auto',
    },
    automationCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Indexes per 02-data-model.md
MediaSchema.index({ igId: 1, mediaId: 1 }, { unique: true });
MediaSchema.index({ igAccountId: 1, postedAt: -1 }); // reels list pagination

export const MediaModel = model<IMedia>('Media', MediaSchema);
