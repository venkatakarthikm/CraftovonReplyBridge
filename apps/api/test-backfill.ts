import mongoose from 'mongoose';
import { IgAccountModel, MediaModel } from '@replybridge/db';
import { backfillMediaSync } from './src/services/backfill.service.js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function run() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGO_URI || '');
  console.log('Connected.');

  const account = await IgAccountModel.findOne({});
  if (!account) {
    console.log('No IG accounts found in the database. Cannot run backfill.');
    process.exit(1);
  }

  console.log(`Running backfill for account ${account.igId}...`);
  try {
    const res = await backfillMediaSync(account._id.toString(), account.igId);
    console.log(`Backfill sync returned:`, res);
  } catch (e: any) {
    console.error('Backfill error:', e.message);
  }

  const mediaWithInsights = await MediaModel.findOne({ igAccountId: account._id, type: 'REEL' }).sort({ postedAt: -1 });
  if (mediaWithInsights) {
    console.log('--- FOUND MEDIA ---');
    console.log('Media ID:', mediaWithInsights.mediaId);
    console.log('Type:', mediaWithInsights.type);
    console.log('Insights:', JSON.stringify(mediaWithInsights.insights, null, 2));
  } else {
    console.log('No reel found with insights.');
  }

  process.exit(0);
}

run().catch(console.error);
