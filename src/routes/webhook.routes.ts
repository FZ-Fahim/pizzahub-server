import express, { Router } from 'express';
import { handleStripeWebhook } from '../controllers/webhook.controller';

const router = Router();

// Stripe Webhook Endpoint (Express raw body parser is required to preserve payload buffer for HMAC signature)
router.post(
  '/stripe',
  express.raw({ type: 'application/json' }),
  handleStripeWebhook
);

export default router;
