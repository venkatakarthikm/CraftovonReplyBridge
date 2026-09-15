import { Router, Request, Response } from 'express';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import pino from 'pino';
import { env } from '../config/env.js';
import { InstagramAccount } from '../models/instagram-account.js';
import { User } from '../models/user.js';
import { requireAuth } from '../middleware/auth.js';
import crypto from 'crypto';

const router = Router();
const logger = pino({ name: 'instagram' });

const SCOPES = [
  'instagram_business_basic',
  'instagram_business_manage_messages',
  'instagram_business_manage_comments',
].join(',');

// Helper: encrypt access token before storing
function encryptToken(token: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(env.ENCRYPTION_KEY, 'base64'), iv);
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

// Helper: decrypt access token when retrieving
function decryptToken(encryptedToken: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedToken.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(env.ENCRYPTION_KEY, 'base64'), iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// GET /api/v1/oauth/instagram/authorize — return the Instagram authorization URL
router.get('/authorize', (req: Request, res: Response) => {
  try {
    const mode = (req.query.mode as string) || 'login'; // 'login' or 'connect'
    const token = (req.query.token as string) || ''; // user's JWT if in 'connect' mode

    let state = mode;
    if (mode === 'connect' && token) {
      // Embed user info in state for 'connect' mode
      try {
        const payload = jwt.verify(token, env.JWT_SECRET) as any;
        state = `connect:${payload.sub}`;
      } catch {
        return res.status(401).json({ error: 'Invalid auth token' });
      }
    }

    const params = new URLSearchParams({
      client_id: env.META_APP_ID,
      redirect_uri: `${env.API_URL}/oauth/instagram/callback`,
      scope: SCOPES,
      response_type: 'code',
      state,
    });

    const authUrl = `https://www.instagram.com/oauth/authorize?${params.toString()}`;
    res.json({ url: authUrl });
  } catch (err: any) {
    logger.error(err, 'Error generating authorize URL');
    res.status(500).json({ error: 'Failed to generate auth URL' });
  }
});

// GET /api/v1/oauth/instagram/callback — Instagram redirects here after user approves
router.get('/callback', async (req: Request, res: Response) => {
  const { code, state, error, error_reason } = req.query;

  if (error) {
    logger.warn({ error, error_reason }, 'User denied authorization');
    return res.redirect(`${env.FRONTEND_URL}/?error=${error}`);
  }

  if (!code) {
    logger.error('No authorization code in callback');
    return res.redirect(`${env.FRONTEND_URL}/?error=no_code`);
  }

  try {
    // STEP 1: Exchange authorization code for short-lived access token
    logger.info('Exchanging code for short-lived token...');
    const shortLivedRes = await axios.post(
      'https://api.instagram.com/oauth/access_token',
      new URLSearchParams({
        client_id: env.META_APP_ID,
        client_secret: env.META_APP_SECRET,
        grant_type: 'authorization_code',
        redirect_uri: `${env.API_URL}/oauth/instagram/callback`,
        code: code as string,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const { access_token: shortLivedToken, user_id: igId } = shortLivedRes.data;
    logger.info({ igId }, 'Got short-lived token');

    // STEP 2: Exchange short-lived token for long-lived token (~60 days)
    logger.info('Exchanging for long-lived token...');
    const longLivedRes = await axios.get('https://graph.instagram.com/access_token', {
      params: {
        grant_type: 'ig_exchange_token',
        client_secret: env.META_APP_SECRET,
        access_token: shortLivedToken,
      },
    });

    const { access_token: longLivedToken, expires_in: expiresInSeconds } = longLivedRes.data;
    const tokenExpiresAt = new Date(Date.now() + expiresInSeconds * 1000);
    logger.info({ expiresInSeconds }, 'Got long-lived token, expires at', tokenExpiresAt);

    // STEP 3: Fetch Instagram profile info
    logger.info('Fetching Instagram profile...');
    const profileRes = await axios.get(`https://graph.instagram.com/${igId}`, {
      params: { fields: 'username', access_token: longLivedToken },
    });
    const igUsername = profileRes.data.username;
    logger.info({ igUsername }, 'Fetched profile');

    // STEP 4: Determine which User owns this Instagram account
    let userId: string;
    const stateStr = state as string;

    if (stateStr?.startsWith('connect:')) {
      // 'connect' mode: attach to existing logged-in user
      userId = stateStr.split(':')[1];
      logger.info({ userId }, 'Connecting account to existing user');
    } else {
      // 'login' mode: find existing user or create new
      const existing = await InstagramAccount.findOne({ igId: String(igId) });
      if (existing) {
        userId = existing.userId.toString();
        logger.info({ userId }, 'Found existing user for this IG account');
      } else {
        const newUser = await User.create({ name: igUsername });
        userId = newUser._id.toString();
        logger.info({ userId }, 'Created new user for this IG account');
      }
    }

    // STEP 5: Encrypt and store the long-lived access token
    logger.info('Encrypting and storing token...');
    const encryptedToken = encryptToken(longLivedToken);

    await InstagramAccount.findOneAndUpdate(
      { igId: String(igId) },
      {
        userId,
        igId: String(igId),
        igUsername,
        accessToken: encryptedToken, // store encrypted
        tokenExpiresAt,
        connectedAt: new Date(),
      },
      { upsert: true, new: true }
    );
    logger.info({ igId, igUsername }, 'Instagram account saved');

    // STEP 6: Issue JWT and redirect to dashboard
    const jwtToken = jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: '30d' });
    const redirectUrl = `${env.FRONTEND_URL}/dashboard?token=${encodeURIComponent(jwtToken)}`;
    logger.info({ redirectUrl }, 'Redirecting to dashboard');
    res.redirect(redirectUrl);
  } catch (err: any) {
    logger.error(
      {
        error: err.response?.data || err.message,
        code,
        state,
      },
      'Instagram OAuth callback failed'
    );
    res.redirect(`${env.FRONTEND_URL}/?error=oauth_failed&message=${encodeURIComponent(err.message)}`);
  }
});

// GET /api/v1/oauth/instagram/accounts — list all connected Instagram accounts for the logged-in user
router.get('/accounts', requireAuth, async (req: Request, res: Response) => {
  try {
    const accounts = await InstagramAccount.find({ userId: req.userId }).select('-accessToken');
    res.json({ accounts });
  } catch (err: any) {
    logger.error(err, 'Failed to fetch Instagram accounts');
    res.status(500).json({ error: 'Could not fetch accounts' });
  }
});

// DELETE /api/v1/oauth/instagram/accounts/:accountId — disconnect an Instagram account
router.delete('/accounts/:accountId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { accountId } = req.params;
    const account = await InstagramAccount.findOneAndDelete({
      _id: accountId,
      userId: req.userId,
    });

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    logger.info({ accountId, igUsername: account.igUsername }, 'Instagram account disconnected');
    res.json({ message: 'Account disconnected' });
  } catch (err: any) {
    logger.error(err, 'Failed to disconnect account');
    res.status(500).json({ error: 'Could not disconnect account' });
  }
});

export default router;