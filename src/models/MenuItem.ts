import { Schema, model, Document, Model, Types } from 'mongoose';

export type MenuCategory =
  | 'Classic Pizzas'
  | 'Vegetarian Pizzas'
  | 'Meat Lovers'
  | 'Specialty / Gourmet Pizzas'
  | 'Sides & Appetizers'
  | 'Beverages & Desserts';

export type MenuItemStatus = 'pending' | 'approved' | 'rejected' | 'inactive';

export interface IMenuItem extends Document {
  vendorId: Types.ObjectId;
  itemName: string;
  category: MenuCategory;
  description: string;
  price: number;
  location: string;
  images: string[];
  status: MenuItemStatus;
  createdAt: Date;
  updatedAt: Date;
}

const menuItemSchema = new Schema<IMenuItem>(
  {
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    itemName: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        'Classic Pizzas',
        'Vegetarian Pizzas',
        'Meat Lovers',
        'Specialty / Gourmet Pizzas',
        'Sides & Appetizers',
        'Beverages & Desserts',
      ],
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    images: {
      type: [String],
      required: true,
      validate: {
        validator: function (v: string[]) {
          return Array.isArray(v) && v.length > 0;
        },
        message: 'At least one image is required for a menu item.',
      },
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'inactive'],
      default: 'pending',
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'menuItems',
  }
);

// Compound index for high performance search, filter, and sorting
menuItemSchema.index({
  itemName: 'text',
  category: 1,
  location: 1,
  status: 1,
  price: 1,
});

export const MenuItem: Model<IMenuItem> = model<IMenuItem>('MenuItem', menuItemSchema);
export default MenuItem;
