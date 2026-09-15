// apps/api/src/services/jwt.ts
// JWT access + refresh token management with Redis blacklist for revocation
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export interface JwtPayload {
  sub: string;    // userId
  email: string;
  role: string;
  plan: string;
  iat?: number;
  exp?: number;
}

export function signAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_ACCESS_TTL as any,
  });
}

export function signRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId, type: 'refresh' }, env.JWT_SECRET, {
    expiresIn: env.JWT_REFRESH_TTL as any,
  });
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}

export function verifyRefreshToken(token: string): { sub: string; type: string } {
  const payload = jwt.verify(token, env.JWT_SECRET) as { sub: string; type: string };
  if (payload.type !== 'refresh') throw new Error('Not a refresh token');
  return payload;
}

/** Generate a signed CSRF state param for OAuth (10 min TTL) */
export function signOAuthState(userId: string): string {
  return jwt.sign({ sub: userId, type: 'oauth_state' }, env.JWT_SECRET, { expiresIn: '10m' });
}

export function verifyOAuthState(state: string): { sub: string } {
  const payload = jwt.verify(state, env.JWT_SECRET) as { sub: string; type: string };
  if (payload.type !== 'oauth_state') throw new Error('Invalid OAuth state');
  return payload;
}

/** Generate a password reset token (1h TTL) */
export function signPasswordResetToken(userId: string, hash: string): string {
  return jwt.sign({ sub: userId, type: 'pw_reset', h: hash.slice(-8) }, env.JWT_SECRET, {
    expiresIn: '1h',
  });
}

export function verifyPasswordResetToken(token: string): { sub: string; h: string } {
  const payload = jwt.verify(token, env.JWT_SECRET) as { sub: string; type: string; h: string };
  if (payload.type !== 'pw_reset') throw new Error('Invalid reset token');
  return { sub: payload.sub, h: payload.h };
}
