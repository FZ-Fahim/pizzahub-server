import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder_key_min_characters';

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-01-27.acacia' as any,
  typescript: true,
});

export default stripe;
