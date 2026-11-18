import { Router } from 'express';
import { createReview, getItemReviews } from '../controllers/review.controller';
import { verifyToken, checkNotBlocked, requireRole } from '../middlewares/auth.middleware';

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
