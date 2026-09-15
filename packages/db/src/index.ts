// packages/db/src/index.ts
// Central export for all Mongoose models and DB connection

export { connectDB, disconnectDB } from './connection.js';

export { UserModel } from './models/user.model.js';
export { IgAccountModel } from './models/igAccount.model.js';
export { MediaModel } from './models/media.model.js';
export { AutomationModel } from './models/automation.model.js';
export { CommentEventModel } from './models/commentEvent.model.js';
export { MessageLogModel } from './models/messageLog.model.js';
export { ConversationStateModel } from './models/conversationState.model.js';
export { TemplateModel } from './models/template.model.js';
export { PlanModel } from './models/plan.model.js';
export { SubscriptionModel } from './models/subscription.model.js';
export { UsageCounterModel } from './models/usageCounter.model.js';
export { AuditLogModel } from './models/auditLog.model.js';
export { WebhookRawModel } from './models/webhookRaw.model.js';
export { HelpArticleModel } from './models/helpArticle.model.js';

// Re-export types
export type { IUser } from './models/user.model.js';
export type { IIgAccount } from './models/igAccount.model.js';
export type { IMedia } from './models/media.model.js';
export type { IAutomation } from './models/automation.model.js';
export type { ICommentEvent } from './models/commentEvent.model.js';
export type { IMessageLog } from './models/messageLog.model.js';
export type { IConversationState } from './models/conversationState.model.js';
export type { ITemplate } from './models/template.model.js';
export type { IPlan } from './models/plan.model.js';
