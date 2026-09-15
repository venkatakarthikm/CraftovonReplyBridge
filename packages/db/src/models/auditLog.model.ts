// packages/db/src/models/auditLog.model.ts
// 02-data-model.md §10 — auditLogs collection
import { Schema, model, Document, Types } from 'mongoose';

const AuditLogSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true },  // e.g. 'automation.patch', 'link.edit'
    targetType: { type: String, required: true },
    targetId: { type: Schema.Types.ObjectId },
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
  },
  { timestamps: true }
);

AuditLogSchema.index({ userId: 1, createdAt: -1 });

export const AuditLogModel = model('AuditLog', AuditLogSchema);
