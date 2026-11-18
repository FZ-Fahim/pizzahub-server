import { Schema, model, Document, Model, Types } from 'mongoose';

export type OrderStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';

export interface IOrder extends Document {
  itemId: Types.ObjectId;
  vendorId: Types.ObjectId;
  customerId: Types.ObjectId;
  deliveryDate: string; // YYYY-MM-DD
  deliveryAddress: string;
  message?: string;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

const orderSchema = new Schema<IOrder>(
  {
    itemId: {
      type: Schema.Types.ObjectId,
      ref: 'MenuItem',
      required: true,
      index: true,
    },
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    deliveryDate: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Delivery date must follow YYYY-MM-DD format'],
      index: true,
    },
    deliveryAddress: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'cancelled'],
      default: 'pending',
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'orders',
  }
);

// Compound index for fast duplicate active order checks and user query lookups
orderSchema.index({
  customerId: 1,
  itemId: 1,
  deliveryDate: 1,
});

export const Order: Model<IOrder> = model<IOrder>('Order', orderSchema);
export default Order;
