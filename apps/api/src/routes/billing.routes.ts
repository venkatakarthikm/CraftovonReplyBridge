// apps/api/src/routes/billing.routes.ts
// Stripe billing integration
import { Router } from 'express';
import express from 'express';
import { stripe } from '../services/stripe.js';
import { requireAuth } from '../middleware/auth.js';
import { SubscriptionModel, UserModel } from '@replybridge/db';

const router = Router();

// Webhook parsing requires raw body, but server.ts mounts this with json.
// We'll export the webhook router separately to mount before body-parser.
export const billingWebhookRouter = Router();

billingWebhookRouter.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res, next) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env['STRIPE_WEBHOOK_SECRET'];

    if (!sig || !webhookSecret) {
      return res.status(400).send('Missing stripe signature or secret');
    }

    try {
      const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object;
          if (session.client_reference_id) {
            await SubscriptionModel.updateOne(
              { userId: session.client_reference_id },
              {
                status: 'active',
                stripeCustomerId: session.customer,
                stripeSubscriptionId: session.subscription,
              },
              { upsert: true }
            );
            // Upgrade user plan based on metadata
            const planKey = session.metadata?.planKey ?? 'pro';
            await UserModel.updateOne(
              { _id: session.client_reference_id },
              { plan: planKey }
            );
          }
          break;
        }
        case 'customer.subscription.deleted': {
          const subscription = event.data.object;
          await SubscriptionModel.updateOne(
            { stripeSubscriptionId: subscription.id },
            { status: 'canceled' }
          );
          break;
        }
      }
      res.json({ received: true });
    } catch (e) {
      next(e);
    }
  }
);

// Protected billing routes
router.use(requireAuth);

router.post('/checkout', async (req, res, next) => {
  try {
    const userId = req.user!.sub;
    const { planKey } = req.body as { planKey: string };
    
    // Hardcoded test price IDs for demonstration
    const priceIds: Record<string, string> = {
      starter: 'price_starter_placeholder',
      pro: 'price_pro_placeholder',
    };

    const priceId = priceIds[planKey];
    if (!priceId) return res.status(400).json({ error: 'Invalid plan' });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${process.env['FRONTEND_URL'] ?? 'http://localhost:5173'}/settings?success=true`,
      cancel_url: `${process.env['FRONTEND_URL'] ?? 'http://localhost:5173'}/settings?canceled=true`,
      client_reference_id: userId,
      metadata: { planKey },
    });

    res.json({ data: { url: session.url } });
  } catch (e) {
    next(e);
  }
});

router.post('/portal', async (req, res, next) => {
  try {
    const userId = req.user!.sub;
    const sub = await SubscriptionModel.findOne({ userId });
    
    if (!sub || !(sub as any).stripeCustomerId) {
      return res.status(400).json({ error: 'No active subscription' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: (sub as any).stripeCustomerId,
      return_url: `${process.env['FRONTEND_URL'] ?? 'http://localhost:5173'}/settings`,
    });

    res.json({ data: { url: session.url } });
  } catch (e) {
    next(e);
  }
});

export default router;
