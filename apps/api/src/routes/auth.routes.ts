// apps/api/src/routes/auth.routes.ts
// Auth endpoints: register, login, refresh, logout, forgot/reset password, /me
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import pino from 'pino';
import { UserModel } from '@replybridge/db';
import { RegisterSchema, LoginSchema, ForgotPasswordSchema, ResetPasswordSchema } from '@replybridge/schemas';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  signPasswordResetToken,
  verifyPasswordResetToken,
} from '../services/jwt.js';
import { requireAuth } from '../middleware/auth.js';
import { authRateLimit } from '../middleware/rateLimit.js';
import { AppError, validate } from '../middleware/errors.js';

const router = Router();
const logger = pino({ name: 'auth' });

const BCRYPT_ROUNDS = 12;
const COOKIE_OPTS = {
  httpOnly: true,
  secure: true, // Must be true for sameSite: 'none'
  sameSite: 'none' as const, // Required for cross-domain API <-> Frontend
  maxAge: 30 * 24 * 3600 * 1000, // 30 days
  path: '/api/v1/auth/refresh',
};

/** POST /auth/register */
router.post('/register', authRateLimit, async (req, res, next) => {
  try {
    const body = validate(RegisterSchema, req.body);

    const existing = await UserModel.findOne({ email: body.email });
    if (existing) throw new AppError(409, 'email_taken', 'Email already registered');

    const passwordHash = await bcrypt.hash(body.password, BCRYPT_ROUNDS);
    const user = await UserModel.create({
      email: body.email,
      passwordHash,
      name: body.name,
      role: 'owner',
      plan: 'free',
      onboarding: { tourDone: false, checklist: ['register'] },
    });

    const accessToken = signAccessToken({
      sub: String(user._id),
      email: user.email,
      role: user.role,
      plan: user.plan,
    });
    const refreshToken = signRefreshToken(String(user._id));

    res.cookie('refreshToken', refreshToken, COOKIE_OPTS);
    res.status(201).json({
      data: {
        accessToken,
        user: { id: String(user._id), email: user.email, name: user.name, role: user.role, plan: user.plan },
      },
    });
  } catch (e) { next(e); }
});

/** POST /auth/login */
router.post('/login', authRateLimit, async (req, res, next) => {
  try {
    const body = validate(LoginSchema, req.body);
    const user = await UserModel.findOne({ email: body.email, deletedAt: null }).select('+passwordHash');
    if (!user) throw new AppError(401, 'invalid_credentials', 'Invalid email or password');

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) throw new AppError(401, 'invalid_credentials', 'Invalid email or password');

    await UserModel.updateOne({ _id: user._id }, { lastLoginAt: new Date() });

    const accessToken = signAccessToken({ sub: String(user._id), email: user.email, role: user.role, plan: user.plan });
    const refreshToken = signRefreshToken(String(user._id));

    res.cookie('refreshToken', refreshToken, COOKIE_OPTS);
    res.json({
      data: {
        accessToken,
        user: { id: String(user._id), email: user.email, name: user.name, role: user.role, plan: user.plan },
      },
    });
  } catch (e) { next(e); }
});

/** POST /auth/refresh — rotate refresh token */
router.post('/refresh', async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken as string | undefined;
    if (!token) throw new AppError(401, 'no_refresh_token', 'No refresh token');

    const payload = verifyRefreshToken(token);
    const user = await UserModel.findById(payload.sub).select('-passwordHash');
    if (!user || user.deletedAt) throw new AppError(401, 'user_not_found', 'User not found');

    const accessToken = signAccessToken({ sub: String(user._id), email: user.email, role: user.role, plan: user.plan });
    const newRefreshToken = signRefreshToken(String(user._id));

    res.cookie('refreshToken', newRefreshToken, COOKIE_OPTS);
    res.json({ data: { accessToken } });
  } catch (e) { next(e); }
});

/** POST /auth/logout */
router.post('/logout', (_req, res) => {
  res.clearCookie('refreshToken', { path: '/api/v1/auth/refresh' });
  res.json({ data: { message: 'Logged out' } });
});

/** POST /auth/forgot-password */
router.post('/forgot-password', authRateLimit, async (req, res, next) => {
  try {
    const { email } = validate(ForgotPasswordSchema, req.body);
    const user = await UserModel.findOne({ email, deletedAt: null });

    // Always respond 200 to prevent email enumeration
    if (user) {
      const resetToken = signPasswordResetToken(String(user._id), user.passwordHash);
      const resetUrl = `${process.env['BASE_URL']}/reset-password?token=${resetToken}`;
      logger.info({ userId: String(user._id), resetUrl }, 'Password reset requested');
      // TODO Phase 9: send email via nodemailer/SMTP_URL
    }
    res.json({ data: { message: 'If that email exists, a reset link has been sent.' } });
  } catch (e) { next(e); }
});

/** POST /auth/reset-password */
router.post('/reset-password', authRateLimit, async (req, res, next) => {
  try {
    const { token, password } = validate(ResetPasswordSchema, req.body);
    const payload = verifyPasswordResetToken(token);
    const user = await UserModel.findById(payload.sub).select('+passwordHash');
    if (!user || user.deletedAt) throw new AppError(400, 'invalid_token', 'Reset token invalid or expired');

    // Validate token is for current password hash (one-time use)
    if (user.passwordHash.slice(-8) !== payload.h) {
      throw new AppError(400, 'token_used', 'Reset token already used');
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await UserModel.updateOne({ _id: user._id }, { passwordHash });
    res.json({ data: { message: 'Password reset successfully' } });
  } catch (e) { next(e); }
});

/** GET /auth/me */
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await UserModel.findById(req.user!.sub).select('-passwordHash');
    if (!user) throw new AppError(404, 'not_found', 'User not found');
    res.json({ data: user });
  } catch (e) { next(e); }
});

/** PATCH /auth/me (update profile) */
router.patch('/me', requireAuth, async (req, res, next) => {
  try {
    const { name, email, password } = req.body as { name?: string; email?: string; password?: string };
    const updateData: Record<string, unknown> = {};

    if (name?.trim()) updateData.name = name.trim();
    
    if (email?.trim()) {
      const existing = await UserModel.findOne({ email: email.trim(), _id: { $ne: req.user!.sub }, deletedAt: null });
      if (existing) throw new AppError(409, 'email_taken', 'Email already in use');
      updateData.email = email.trim();
    }
    
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    }

    if (Object.keys(updateData).length === 0) {
      throw new AppError(400, 'validation', 'Nothing to update');
    }

    const user = await UserModel.findByIdAndUpdate(
      req.user!.sub,
      updateData,
      { new: true, select: '-passwordHash' }
    );
    res.json({ data: user });
  } catch (e) { next(e); }
});

export default router;
