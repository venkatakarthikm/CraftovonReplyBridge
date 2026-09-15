// packages/schemas/src/template.schema.ts
import { z } from 'zod';
import { TemplateBodySchema } from './automation.schema.js';

export const TemplateKindSchema = z.enum(['private_reply', 'comment_reply', 'dm_reply']);

export const CreateTemplateSchema = z.object({
  kind: TemplateKindSchema,
  name: z.string().min(1).max(100),
  body: TemplateBodySchema,
});

export const PatchTemplateSchema = CreateTemplateSchema.partial();

export type TemplateKind = z.infer<typeof TemplateKindSchema>;
export type CreateTemplateInput = z.infer<typeof CreateTemplateSchema>;
