import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IReview extends Document {
  itemId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  rating: number; // 1 to 5
  comment: string;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema: Schema<IReview> = new Schema(
  {
    itemId: {
      type: Schema.Types.ObjectId,
      ref: 'MenuItem',
      required: [true, 'itemId is required for a review.'],
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'customerId is required for a review.'],
      index: true,
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required.'],
      min: [1, 'Rating must be at least 1.'],
      max: [5, 'Rating cannot exceed 5.'],
    },
    comment: {
      type: String,
      required: [true, 'Review comment is required.'],
      trim: true,
      maxlength: [1000, 'Comment cannot exceed 1000 characters.'],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient lookup
reviewSchema.index({ itemId: 1, createdAt: -1 });

export const Review: Model<IReview> =
  mongoose.models.Review || mongoose.model<IReview>('Review', reviewSchema);

export default Review;
