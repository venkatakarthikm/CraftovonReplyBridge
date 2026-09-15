// apps/workers/src/index.ts
// Worker fleet entry point: starts all BullMQ workers + cron jobs
import 'dotenv/config';
import pino from 'pino';
import { connectDB } from '@replybridge/db';
import { startCommentWorker } from './commentWorker.js';
import { startDmWorker } from './dmWorker.js';
import { startBackfillWorker } from './backfillWorker.js';
import { startTokenRefreshWorker } from './tokenRefreshWorker.js';

const logger = pino({ name: 'workers' });

const MONGO_URI = process.env['MONGO_URI'] ?? 'mongodb://localhost:27017/replybridge';

async function main() {
  logger.info('Starting worker fleet…');

  await connectDB(MONGO_URI);

  // Start all workers
  const commentWorker = startCommentWorker();
  const dmWorker = startDmWorker();
  const backfillWorker = startBackfillWorker();
  startTokenRefreshWorker();

  logger.info('✅ All workers started');
  logger.info({
    queues: ['wf-events (concurrency:20)', 'dm-send (concurrency:10, limiter:90/min/ig)', 'backfill (concurrency:2)'],
  }, 'Worker fleet running');

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down workers…');
    await commentWorker.close();
    await dmWorker.close();
    await backfillWorker.close();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  logger.error({ err }, '❌ Worker fleet startup failed');
  process.exit(1);
});
