// apps/api/src/server.ts
// Express API server bootstrap
import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import pino from 'pino';
import { connectDB } from '@replybridge/db';
import { env } from './config/env.js';
import { errorHandler, notFound } from './middleware/errors.js';
import { dashboardRateLimit } from './middleware/rateLimit.js';

// Routes
import webhookRouter from './routes/webhook.routes.js';
import authRouter from './routes/auth.routes.js';
import instagramRouter from './routes/instagram.routes.js';
import mediaRouter from './routes/media.routes.js';
import automationRouter from './routes/automation.routes.js';
import analyticsRouter from './routes/analytics.routes.js';
import templatesRouter from './routes/templates.routes.js';
import inboxRouter from './routes/inbox.routes.js';
import helpRouter from './routes/help.routes.js';
import billingRouter, { billingWebhookRouter } from './routes/billing.routes.js';

const logger = pino({ name: 'api' });
const app = express();

// ── Security headers ──────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: env.BASE_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
}));

// ── Request logging ───────────────────────────────────────────────────────
app.use((pinoHttp as any)({ logger }));

// ── Cookie parser ─────────────────────────────────────────────────────────
app.use(cookieParser());

// ── WEBHOOK: MUST use raw body for HMAC verification ─────────────────────
// Must be mounted BEFORE express.json() to preserve raw body
app.use('/webhook', express.raw({ type: 'application/json' }), webhookRouter);
// OAuth callback (no body parsing needed)
app.use('/oauth/instagram', instagramRouter);

// ── JSON body parsing for all other routes ────────────────────────────────
// Stripe webhooks must use raw body parsing
app.use('/api/v1/billing', billingWebhookRouter);

app.use(express.json({ limit: '1mb' }));

// ── API v1 routes ─────────────────────────────────────────────────────────
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/instagram', instagramRouter);
app.use('/api/v1/media', dashboardRateLimit, mediaRouter);
app.use('/api/v1/billing', dashboardRateLimit, billingRouter);
app.use('/api/v1/automations', dashboardRateLimit, automationRouter);
app.use('/api/v1/analytics', dashboardRateLimit, analyticsRouter);
app.use('/api/v1/templates', dashboardRateLimit, templatesRouter);
app.use('/api/v1/inbox', dashboardRateLimit, inboxRouter);
app.use('/api/v1/help', helpRouter); // public — no auth

import mongoose from 'mongoose';

// ── Health check ──────────────────────────────────────────────────────────
app.get('/healthz', async (_req, res) => {
  try {
    const dbState = mongoose.connection.readyState; // 1 = connected

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      db: dbState === 1 ? 'connected' : 'disconnected',
      env: env.NODE_ENV,
    });
  } catch (err) {
    logger.error({ err }, 'Healthcheck error');
    res.status(500).json({ status: 'error', error: String(err) });
  }
});

// ── 404 + error handler ───────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────────────────
async function start() {
  try {
    await connectDB(env.MONGO_URI);
    app.listen(env.PORT, () => {
      logger.info({ port: env.PORT, env: env.NODE_ENV }, '🚀 API server started');
    });
  } catch (err) {
    logger.error({ err }, 'Failed to start API server');
    process.exit(1);
  }
}

start();

export { app }; // for supertest
