import mongoose from 'mongoose';
import { IgAccountModel, MediaModel } from '@replybridge/db';
import { GraphMediaClient, mapMediaType } from '@replybridge/graph/media';
import { decrypt } from './src/services/crypto.js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function run() {
  await mongoose.connect(process.env.MONGO_URI || '');
  
  const account = await IgAccountModel.findOne({}).select('+tokenCipher');
  if (!account) process.exit(1);

  const accessToken = decrypt(account.tokenCipher);
  const mediaClient = new GraphMediaClient(accessToken);

  const { data: items } = await mediaClient.listMedia(account.igId, undefined, 2);
  for (const item of items) {
    console.log('Media Item:', item.id, item.media_product_type, item.media_type);
    if (mapMediaType(item) === 'REEL') {
      try {
        const raw = await mediaClient.client.get(`/${item.id}/insights`, {
          params: { metric: 'comments,likes,views,reach,saved,shares,total_interactions,ig_reels_avg_watch_time,ig_reels_video_view_total_time' }
        });
        console.log('Raw Insights Data:', JSON.stringify(raw.data, null, 2));
      } catch (e: any) {
        console.error('Insights Error:', e.response?.data || e.message);
      }
    }
  }

  process.exit(0);
}

run().catch(console.error);
