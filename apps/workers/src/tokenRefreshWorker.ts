// apps/workers/src/tokenRefreshWorker.ts
// Daily cron (03:00 UTC): refresh long-lived tokens expiring within 15 days.
// META-VERIFIED: grant_type=ig_refresh_token; token must be ≥24h old.
// On failure: mark account token_expired, pause automations, alert user.
import cron from 'node-cron';
import pino from 'pino';
import { IgAccountModel, AutomationModel } from '@replybridge/db';
import { GraphMediaClient } from '@replybridge/graph/media';
import { decrypt, encrypt } from './services/crypto.js';

const logger = pino({ name: 'token-refresh' });

// Refresh tokens expiring within 15 days
const REFRESH_THRESHOLD_DAYS = 15;
const ALERT_THRESHOLD_DAYS = 14;

export function startTokenRefreshWorker(): void {
  const cronExpr = process.env['TOKEN_REFRESH_CRON'] ?? '0 3 * * *'; // 03:00 UTC daily

  cron.schedule(cronExpr, async () => {
    logger.info('Token refresh cron starting');
    try {
      await refreshExpiringTokens();
    } catch (e) {
      logger.error({ e }, 'Token refresh cron failed');
    }
  });

  logger.info({ cron: cronExpr }, 'Token refresh cron scheduled');
}

async function refreshExpiringTokens(): Promise<void> {
  const thresholdDate = new Date(Date.now() + REFRESH_THRESHOLD_DAYS * 24 * 3600 * 1000);

  const expiringAccounts = await IgAccountModel.find({
    status: 'active',
    tokenExpiresAt: { $lt: thresholdDate },
  }).select('+tokenCipher');

  logger.info({ count: expiringAccounts.length }, 'Accounts with expiring tokens');

  for (const account of expiringAccounts) {
    try {
      const currentToken = decrypt(account.tokenCipher);

      // Refresh via Graph API
      const { access_token, expires_in } = await GraphMediaClient.refreshToken(currentToken);

      const newCipher = encrypt(access_token);
      await IgAccountModel.updateOne(
        { _id: account._id },
        {
          tokenCipher: newCipher,
          tokenExpiresAt: new Date(Date.now() + expires_in * 1000),
          tokenRefreshedAt: new Date(),
          status: 'active',
        }
      );

      logger.info({ igId: account.igId, expiresIn: expires_in }, 'Token refreshed');
    } catch (e) {
      logger.error({ igId: account.igId, e }, 'Token refresh failed');

      // Mark as expired, pause automations
      await IgAccountModel.updateOne({ _id: account._id }, { status: 'token_expired' });
      await AutomationModel.updateMany(
        { igAccountId: account._id },
        { enabled: false }
      );

      // TODO Phase 8: send reconnect email to account.userId
      logger.warn({ igId: account.igId }, 'Account marked token_expired — automations paused');
    }
  }
}

// Export for testing
export { refreshExpiringTokens };
