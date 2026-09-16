import pino from 'pino';
import { IgAccountModel, MediaModel } from '@replybridge/db';
import { GraphMediaClient, mapMediaType } from '@replybridge/graph/media';
import { decrypt } from './crypto.js';

const logger = pino({ name: 'backfill-service' });
const MAX_MEDIA_IMPORT = 100;

export async function backfillMediaSync(igAccountId: string, igId: string): Promise<{ imported: number; failed: number }> {
  const account = await IgAccountModel.findById(igAccountId).select('+tokenCipher');
  if (!account) throw new Error(`Account ${igAccountId} not found`);
  const accessToken = decrypt(account.tokenCipher);

  const mediaClient = new GraphMediaClient(accessToken);

  let imported = 0;
  let failed = 0;
  let cursor: string | undefined;

  while (imported < MAX_MEDIA_IMPORT) {
    const { data: items, paging } = await mediaClient.listMedia(
      igId,
      cursor,
      Math.min(25, MAX_MEDIA_IMPORT - imported)
    );

    for (const item of items) {
      const mediaType = mapMediaType(item);
      let insights: Record<string, number> | undefined;

      if (mediaType === 'REEL') {
        insights = await mediaClient.getReelInsights(item.id);
      }

      try {
        await MediaModel.updateOne(
          { igId, mediaId: item.id },
          {
            $setOnInsert: {
              igAccountId: account._id,
              igId,
              mediaId: item.id,
              postedAt: new Date(item.timestamp),
              source: 'backfill',
              commentCount: 0,
              automationCount: 0,
            },
            $set: {
              type: mediaType,
              caption: item.caption ?? '',
              permalink: item.permalink ?? '',
              thumbnailUrl: item.thumbnail_url ?? '',
              ...(insights && Object.keys(insights).length > 0 ? { insights } : {}),
            }
          },
          { upsert: true }
        );
        imported++;
      } catch (err) {
        const code = (err as { code?: number }).code;
        if (code === 11000) {
          imported++;
          continue;
        }
        failed++;
        logger.error({ err, mediaId: item.id }, 'Media insert failed');
      }
    }

    if (!paging?.next || imported >= MAX_MEDIA_IMPORT) break;
    cursor = paging.cursors.after;
  }

  logger.info({ igId, imported, failed }, 'Media backfill complete (Sync Mode)');
  return { imported, failed };
}
