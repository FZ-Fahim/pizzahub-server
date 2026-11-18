import { Schema, model, Document, Model } from 'mongoose';

export type UserRole = 'customer' | 'vendor' | 'admin';
export type SubscriptionPlan = 'free' | 'premium';

export interface IUser extends Document {
  name: string;
  email: string;
  emailVerified?: boolean;
  image?: string;
  role: UserRole;
  isBlocked: boolean;
  businessName?: string;
  subscriptionPlan: SubscriptionPlan;
  subscriptionExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    image: {
      type: String,
      default: '',
    },
    role: {
      type: String,
      enum: ['customer', 'vendor', 'admin'],
      default: 'customer',
      index: true,
    },
    isBlocked: {
      type: Boolean,
      default: false,
      index: true,
    },
    businessName: {
      type: String,
      trim: true,
    },
    subscriptionPlan: {
      type: String,
      enum: ['free', 'premium'],
      default: 'free',
      index: true,
    },
    subscriptionExpiresAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: 'users',
  }
);

export const User: Model<IUser> = model<IUser>('User', userSchema);
export default User;
