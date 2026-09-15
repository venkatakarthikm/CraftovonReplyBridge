// apps/api/src/config/env.ts
// Zod-validated environment configuration — fails fast at boot if any required var is missing
import { z } from 'zod';
import 'dotenv/config';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(8080),

  // Meta / Instagram
  META_APP_ID: z.string().min(1),
  META_APP_SECRET: z.string().min(1),
  META_APP_CONFIG_ID: z.string().min(1),
  WEBHOOK_VERIFY_TOKEN: z.string().min(8),
  GRAPH_VERSION: z.string().default('v21.0'),
  PRIVATE_REPLY_BUTTON_MODE: z.enum(['attempt', 'text_only']).default('attempt'),

  // Core
  BASE_URL: z.string().url(),
  API_URL: z.string().url(),
  MONGO_URI: z.string().min(1),
  REDIS_URL: z.string().min(1),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('30d'),

  // AES-256-GCM (32 bytes base64)
  ENCRYPTION_KEY: z.string().min(32),

  // Limits
  RATE_LIMIT_DMS_PER_MIN_PER_IG: z.coerce.number().default(90),
  PRIVATE_REPLIES_PER_HOUR_PER_IG: z.coerce.number().default(700),

  // Email
  SMTP_URL: z.string().optional(),
  EMAIL_FROM: z.string().email().default('virat18mvk@gmail.com'),

  // Billing
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('[env] ❌ Invalid environment configuration:');
  console.error(parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
