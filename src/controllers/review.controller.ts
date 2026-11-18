import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Review } from '../models/Review.js';
import { MenuItem } from '../models/MenuItem.js';

export const createReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const customer = req.user!;
    const { itemId, rating, comment } = req.body;

    if (!itemId || !rating || !comment) {
      res.status(400).json({
        error: 'BadRequest',
        message: 'itemId, rating, and comment are required fields.',
      });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      res.status(400).json({
        error: 'BadRequest',
        message: 'Invalid itemId format.',
      });
      return;
    }

    const numRating = Number(rating);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      res.status(400).json({
        error: 'BadRequest',
        message: 'Rating must be a number between 1 and 5.',
      });
      return;
    }

    const item = await MenuItem.findById(itemId);
    if (!item) {
      res.status(404).json({
        error: 'NotFound',
        message: 'Menu item not found.',
      });
      return;
    }

    const review = await Review.create({
      itemId,
      customerId: customer.id,
      rating: numRating,
      comment: comment.trim(),
    });

    const populatedReview = await Review.findById(review._id).populate(
      'customerId',
      'name email image'
    );

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully!',
      data: populatedReview,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'InternalServerError',
      message: `Failed to submit review: ${error.message}`,
    });
  }
};

export const getItemReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const { itemId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      res.status(400).json({
        error: 'BadRequest',
        message: 'Invalid itemId format.',
      });
      return;
    }

    const reviews = await Review.find({ itemId })
      .sort({ createdAt: -1 })
      .populate('customerId', 'name email image');

    const totalCount = reviews.length;
    const averageRating =
      totalCount > 0
        ? Number(
            (
              reviews.reduce((acc: number, curr: any) => acc + curr.rating, 0) / totalCount
            ).toFixed(1)
          )
        : 5.0;

    res.status(200).json({
      success: true,
      count: totalCount,
      averageRating,
      data: reviews,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'InternalServerError',
      message: `Failed to retrieve reviews: ${error.message}`,
    });
  }
};
