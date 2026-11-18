import { Router } from 'express';
import { createReview, getItemReviews } from '../controllers/review.controller.js';
import { verifyToken, checkNotBlocked, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();

// Public: View reviews for a specific menu item
router.get('/item/:itemId', getItemReviews);

// Customer only: Submit a review
router.post(
  '/',
  verifyToken,
  checkNotBlocked,
  requireRole('customer'),
  createReview
);

export default router;
