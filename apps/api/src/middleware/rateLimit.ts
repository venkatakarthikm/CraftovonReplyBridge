// apps/api/src/middleware/rateLimit.ts
// Per-user rate limiting for dashboard APIs (120 req/min)
import rateLimit from 'express-rate-limit';

/** Dashboard API rate limit: 120 req/min per user (by Authorization header or IP) */
export const dashboardRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) =>
    (req.headers.authorization ?? req.ip ?? 'anonymous'),
  message: {
    error: {
      code: 'rate_limited',
      message: 'Too many requests. Please retry after 60 seconds.',
    },
  },
});

/** Strict rate limit for auth endpoints (10 req/min per IP) */
export const authRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'rate_limited',
      message: 'Too many auth attempts. Please retry after 60 seconds.',
    },
  },
});
