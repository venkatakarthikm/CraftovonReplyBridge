// packages/schemas/src/analytics.schema.ts
import { z } from 'zod';

export const AnalyticsOverviewQuerySchema = z.object({
  igAccountId: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export type AnalyticsOverviewQuery = z.infer<typeof AnalyticsOverviewQuerySchema>;
