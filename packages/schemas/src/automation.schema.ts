// packages/schemas/src/automation.schema.ts
import { z } from 'zod';
import { ObjectIdSchema } from './common.schema.js';

export const TriggerModeSchema = z.enum(['any_comment', 'keyword']);
export const MatchAsSchema = z.enum(['contains', 'exact']);
export const AutomationScopeSchema = z.enum(['media', 'account_default']);

// Template variables allowed in reply text
const ALLOWED_VARS = ['{{name}}', '{{username}}', '{{reel_caption_first_line}}', '{{link}}'] as const;

export const TemplateBodySchema = z.string().max(2000).superRefine((val, ctx) => {
  const matches = val.match(/\{\{[^}]+\}\}/g) ?? [];
  for (const match of matches) {
    if (!(ALLOWED_VARS as readonly string[]).includes(match)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Unknown template variable: ${match}. Allowed: ${ALLOWED_VARS.join(', ')}`,
      });
    }
  }
});

export const CreateAutomationSchema = z.object({
  igAccountId: ObjectIdSchema,
  scope: AutomationScopeSchema,
  mediaId: z.string().optional(),
  name: z.string().min(1).max(100),
  enabled: z.boolean().default(true),
  trigger: z.object({
    mode: TriggerModeSchema,
    keywords: z.array(z.string().min(1).max(50)).default([]),
    matchAs: MatchAsSchema.default('contains'),
  }),
  privateReply: z.object({
    templateId: ObjectIdSchema.nullable().optional(),
    text: TemplateBodySchema,
  }),
  commentReply: z
    .object({
      enabled: z.boolean().default(false),
      text: TemplateBodySchema,
    })
    .optional(),
  followUp: z
    .object({
      enabled: z.boolean().default(false),
      delaySeconds: z.number().int().min(0).max(3600).default(5),
      text: TemplateBodySchema,
    })
    .optional(),
  link: z.object({
    url: z.string().url(),
    buttonTitle: z.string().min(1).max(20).default('Open Link'),
  }),
  backfill: z
    .object({
      enabled: z.boolean().default(false),
    })
    .optional(),
});

export const PatchAutomationSchema = CreateAutomationSchema.partial().extend({
  version: z.number().int().optional(),
});

export const ToggleAutomationSchema = z.object({
  enabled: z.boolean(),
});

export type CreateAutomationInput = z.infer<typeof CreateAutomationSchema>;
export type PatchAutomationInput = z.infer<typeof PatchAutomationSchema>;
