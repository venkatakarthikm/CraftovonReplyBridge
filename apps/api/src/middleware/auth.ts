// apps/api/src/middleware/auth.ts
// JWT authentication middleware — attaches req.user on success
import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, type JwtPayload } from '../services/jwt.js';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: { code: 'unauthenticated', message: 'Missing or invalid Authorization header' } });
    return;
  }

  const token = authHeader.slice(7);
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    res.status(401).json({ error: { code: 'token_invalid', message: 'Token expired or invalid' } });
  }
}

/** Optional auth — attaches user if token present, proceeds regardless */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      req.user = verifyAccessToken(authHeader.slice(7));
    } catch { /* ignore */ }
  }
  next();
}
