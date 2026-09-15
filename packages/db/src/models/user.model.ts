// packages/db/src/models/user.model.ts
// 02-data-model.md §1 — users collection
import { Schema, model, Document, Types } from 'mongoose';

export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  passwordHash: string;
  name: string;
  role: 'owner' | 'admin' | 'member';
  plan: 'free' | 'starter' | 'pro' | 'agency';
  onboarding: {
    tourDone: boolean;
    checklist: string[];
  };
  lastLoginAt?: Date;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: ['owner', 'admin', 'member'],
      default: 'owner',
    },
    plan: {
      type: String,
      enum: ['free', 'starter', 'pro', 'agency'],
      default: 'free',
    },
    onboarding: {
      tourDone: { type: Boolean, default: false },
      checklist: { type: [String], default: [] },
    },
    lastLoginAt: { type: Date },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Indexes per 02-data-model.md
UserSchema.index({ email: 1 }, { unique: true });
// TTL: soft-deleted users purged after 30 days (privacy policy §5)
UserSchema.index({ deletedAt: 1 }, { expireAfterSeconds: 30 * 24 * 3600, sparse: true });

// Never return passwordHash in JSON
UserSchema.set('toJSON', {
  transform: (_doc, ret: any) => {
    delete ret.passwordHash;
    return ret;
  },
});

export const UserModel = model<IUser>('User', UserSchema);
