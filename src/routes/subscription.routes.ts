import { Router } from 'express';
import {
  createCheckoutSession,
  getSubscriptionStatus,
  verifyCheckoutSession,
} from '../controllers/subscription.controller';
import { verifyToken, checkNotBlocked, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// Create Stripe Checkout Session (Vendor only)
router.post(
  '/create-checkout-session',
  verifyToken,
  checkNotBlocked,
  requireRole('vendor'),
  createCheckoutSession
);

// Verify completed Stripe Checkout Session & activate subscription (Vendor only)
router.post(
  '/verify-session',
  verifyToken,
  checkNotBlocked,
  requireRole('vendor'),
  verifyCheckoutSession
);

// View current subscription status & limits (Vendor only)
router.get(
  '/status',
  verifyToken,
  checkNotBlocked,
  requireRole('vendor'),
  getSubscriptionStatus
);

export default router;
