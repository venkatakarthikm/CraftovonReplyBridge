// packages/schemas/src/media.schema.ts
import { z } from 'zod';

export const MediaTypeSchema = z.enum(['REEL', 'POST', 'CAROUSEL', 'STORY', 'LIVE']);

export const MediaFilterSchema = z.object({
  igAccountId: z.string(),
  type: MediaTypeSchema.optional(),
  search: z.string().optional(),
  automated: z.enum(['all', 'on', 'off']).default('all'),
  sort: z.enum(['postedAt']).default('postedAt'),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export type MediaType = z.infer<typeof MediaTypeSchema>;
export type MediaFilterInput = z.infer<typeof MediaFilterSchema>;
