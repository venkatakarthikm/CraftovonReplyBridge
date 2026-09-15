// apps/api/src/services/stripe.ts
import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env['STRIPE_SECRET_KEY'] ?? 'sk_test_placeholder';

export const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
  typescript: true,
});
