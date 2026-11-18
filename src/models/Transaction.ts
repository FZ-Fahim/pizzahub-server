import { Schema, model, Document, Model, Types } from 'mongoose';

export type TransactionStatus = 'completed' | 'failed';

export interface ITransaction extends Document {
  vendorId: Types.ObjectId;
  plan: 'premium';
  amount: number;
  currency: string;
  stripeSessionId: string;
  stripeSubscriptionId?: string;
  status: TransactionStatus;
  createdAt: Date;
}

const transactionSchema = new Schema<ITransaction>(
  {
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    plan: {
      type: String,
      enum: ['premium'],
      default: 'premium',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      default: 'usd',
      lowercase: true,
    },
    stripeSessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    stripeSubscriptionId: {
      type: String,
    },
    status: {
      type: String,
      enum: ['completed', 'failed'],
      default: 'completed',
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    collection: 'transactions',
  }
);

export const Transaction: Model<ITransaction> = model<ITransaction>('Transaction', transactionSchema);
export default Transaction;
