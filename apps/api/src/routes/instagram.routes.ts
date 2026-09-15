// apps/api/src/routes/instagram.routes.ts
// Instagram OAuth flow + account management
// META-VERIFIED: Scopes: instagram_business_basic,instagram_business_manage_comments,
//   instagram_business_manage_messages (deprecated legacy names Jan 27 2025)
import { Router } from 'express';
import pino from 'pino';
import { IgAccountModel, AutomationModel, UserModel } from '@replybridge/db';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/errors.js';
import { backfillMediaSync } from '../services/backfill.service.js';
import { env } from '../config/env.js';
import { signOAuthState, verifyOAuthState } from '../services/jwt.js';
import { encrypt, decrypt } from '../services/crypto.js';
import { exchangeCodeForTokens, GraphMediaClient } from '@replybridge/graph/media';
import { enqueueBackfill } from '../queues/producers.js';

const router = Router();
const logger = pino({ name: 'instagram' });

// META-VERIFIED: Required scopes for Instagram Login path
const SCOPES = [
  'instagram_business_basic',
  'instagram_business_manage_comments',
  'instagram_business_manage_messages',
].join(',');

/** GET /instagram/authorize — redirect to Meta consent dialog */
router.get('/authorize', requireAuth, (req, res) => {
  const state = signOAuthState(req.user!.sub);
  const params = new URLSearchParams({
    client_id: env.META_APP_ID,
    redirect_uri: `${env.API_URL}/oauth/instagram/callback`,
    scope: SCOPES,
    response_type: 'code',
    state,
  });
  const authUrl = `https://www.instagram.com/oauth/authorize?${params.toString()}`;
  res.json({ data: { authUrl } });
});

/** GET /oauth/instagram/callback — exchange code for tokens, upsert IgAccount */
router.get('/callback', async (req, res, next) => {
  try {
    const { code, state, error } = req.query as Record<string, string>;

    if (error) {
      logger.warn({ error }, 'OAuth denied by user');
      return res.redirect(`${env.BASE_URL}/settings?error=oauth_denied`);
    }

    if (!code || !state) {
      throw new AppError(400, 'invalid_callback', 'Missing code or state');
    }
    

    // Validate CSRF state
    const { sub: userId } = verifyOAuthState(state);

    // Exchange code for tokens
    const { longLivedToken, expiresIn, igId, username, accountType } = await exchangeCodeForTokens(
      code,
      env.META_APP_ID,
      env.META_APP_SECRET,
      `${env.API_URL}/oauth/instagram/callback`
    );

    // Encrypt token — NEVER store plaintext
    const tokenCipher = encrypt(longLivedToken);
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);
    const tokenRefreshedAt = new Date();

    // Upsert IgAccount
    const account = await IgAccountModel.findOneAndUpdate(
      { igId },
      {
        $set: {
          userId,
          igId,
          username,
          accountType: accountType.toUpperCase() as 'BUSINESS' | 'MEDIA_CREATOR',
          scopes: SCOPES.split(','),
          tokenCipher,
          tokenExpiresAt,
          tokenRefreshedAt,
          webhookSubscribed: false,
          status: 'active',
        },
      },
      { upsert: true, new: true }
    );

    logger.info({ igId, userId }, 'IG account connected');

    // Subscribe webhook (best-effort, will retry if fails)
    try {
      const mediaClient = new GraphMediaClient(longLivedToken);
      await mediaClient.subscribeWebhook(igId, env.META_APP_ID, env.META_APP_SECRET);
      await IgAccountModel.updateOne({ igId }, { webhookSubscribed: true });
    } catch (e) {
      logger.warn({ e, igId }, 'Webhook subscription failed — will retry');
    }

    // Add to checklist
    await UserModel.updateOne(
      { _id: userId },
      { $addToSet: { 'onboarding.checklist': 'connect_ig' } }
    );

    // Trigger backfill asynchronously (don't await so redirect happens instantly)
    backfillMediaSync(String(account._id), igId)
      .then(() => {
        UserModel.updateOne(
          { _id: userId },
          { $addToSet: { 'onboarding.checklist': 'reels_imported' } }
        ).catch(() => {});
      })
      .catch((e) => {
        logger.error({ e, igId }, 'Failed inline backfill job');
      });

    const frontendUrl = env.BASE_URL.replace(/\/$/, '');
    res.redirect(`${frontendUrl}/reels?connected=1`);
  } catch (e) { next(e); }
});

/** GET /instagram/accounts — list connected accounts with token health */
router.get('/accounts', requireAuth, async (req, res, next) => {
  try {
    const accounts = await IgAccountModel.find({
      userId: req.user!.sub,
    }).select('-tokenCipher'); // never return cipher to client

    res.json({ data: accounts });
  } catch (e) { next(e); }
});

/** DELETE /instagram/accounts/:id — disconnect account */
router.delete('/accounts/:id', requireAuth, async (req, res, next) => {
  try {
    const account = await IgAccountModel.findById(req.params['id']);
    if (!account) throw new AppError(404, 'not_found', 'Account not found');
    if (String(account.userId) !== req.user!.sub) {
      throw new AppError(403, 'forbidden', 'Not your account');
    }

    // Pause all automations
    await AutomationModel.updateMany(
      { igAccountId: account._id },
      { $set: { enabled: false } }
    );

    // Delete token + mark revoked (do NOT delete account doc for audit trail)
    await IgAccountModel.updateOne(
      { _id: account._id },
      { $set: { tokenCipher: '', status: 'revoked', webhookSubscribed: false } }
    );

    logger.info({ igId: account.igId }, 'IG account disconnected');
    res.json({ data: { message: 'Account disconnected' } });
  } catch (e) { next(e); }
});

/** POST /instagram/accounts/:id/refresh — manual token refresh */
router.post('/accounts/:id/refresh', requireAuth, async (req, res, next) => {
  try {
    const account = await IgAccountModel.findById(req.params['id']).select('+tokenCipher');
    if (!account) throw new AppError(404, 'not_found', 'Account not found');
    if (String(account.userId) !== req.user!.sub) {
      throw new AppError(403, 'forbidden', 'Not your account');
    }

    const currentToken = decrypt(account.tokenCipher);
    const { access_token, expires_in } = await GraphMediaClient.refreshToken(currentToken);

    const tokenCipher = encrypt(access_token);
    await IgAccountModel.updateOne(
      { _id: account._id },
      {
        tokenCipher,
        tokenExpiresAt: new Date(Date.now() + expires_in * 1000),
        tokenRefreshedAt: new Date(),
        status: 'active',
      }
    );

    res.json({ data: { message: 'Token refreshed', expiresIn: expires_in } });
  } catch (e) { next(e); }
});

export default router;
