import pino from 'pino';
import { IgAccountModel, MediaModel } from '@replybridge/db';
import { GraphMediaClient } from '@replybridge/graph/media';
import { decrypt } from './crypto.js';

const logger = pino({ name: 'backfill-service' });
const MAX_MEDIA_IMPORT = 100;

export async function backfillMediaSync(igAccountId: string, igId: string): Promise<void> {
  const account = await IgAccountModel.findById(igAccountId).select('+tokenCipher');
  if (!account) throw new Error(`Account ${igAccountId} not found`);
  const accessToken = decrypt(account.tokenCipher);

  const mediaClient = new GraphMediaClient(accessToken);

  let imported = 0;
  let cursor: string | undefined;

  while (imported < MAX_MEDIA_IMPORT) {
    const { data: items, paging } = await mediaClient.listMedia(
      igId,
      cursor,
      Math.min(25, MAX_MEDIA_IMPORT - imported)
    );

    for (const item of items) {
      const mediaType = (item.media_product_type ?? item.media_type).toUpperCase() as
        | 'REEL'
        | 'POST'
        | 'CAROUSEL'
        | 'STORY'
        | 'LIVE';

      try {
        await MediaModel.updateOne(
          { igId, mediaId: item.id },
          {
            $setOnInsert: {
              igAccountId: account._id,
              igId,
              mediaId: item.id,
              type: mediaType,
              caption: item.caption ?? '',
              permalink: item.permalink ?? '',
              thumbnailUrl: item.thumbnail_url ?? '',
              postedAt: new Date(item.timestamp),
              source: 'backfill',
              commentCount: 0,
              automationCount: 0,
            },
          },
          { upsert: true }
        );
        imported++;
      } catch {
        // Skip duplicates silently
      }
    }

    if (!paging?.next || imported >= MAX_MEDIA_IMPORT) break;
    cursor = paging.cursors.after;
  }

  logger.info({ igId, imported }, 'Media backfill complete (Sync Mode)');
}
