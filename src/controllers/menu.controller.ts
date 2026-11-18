import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { MenuItem, MenuCategory, MenuItemStatus } from '../models/MenuItem';

const VALID_CATEGORIES: MenuCategory[] = [
  'Classic Pizzas',
  'Vegetarian Pizzas',
  'Meat Lovers',
  'Specialty / Gourmet Pizzas',
  'Sides & Appetizers',
  'Beverages & Desserts',
];

export const createMenuItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { itemName, category, description, price, location, images } = req.body;

    if (!itemName || !category || !description || price === undefined || !location || !images) {
      res.status(400).json({
        error: 'BadRequest',
        message: 'All fields (itemName, category, description, price, location, images) are required.',
      });
      return;
    }

    if (!VALID_CATEGORIES.includes(category)) {
      res.status(400).json({
        error: 'BadRequest',
        message: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`,
      });
      return;
    }

    const parsedPrice = Number(price);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      res.status(400).json({
        error: 'BadRequest',
        message: 'Price must be a positive number.',
      });
      return;
    }

    if (!Array.isArray(images) || images.length === 0) {
      res.status(400).json({
        error: 'BadRequest',
        message: 'Images must be a non-empty array of valid image URLs.',
      });
      return;
    }

    const newItem = await MenuItem.create({
      vendorId: req.user!.id,
      itemName: itemName.trim(),
      category,
      description: description.trim(),
      price: parsedPrice,
      location: location.trim(),
      images,
      status: 'pending', // Always start as pending review
    });

    res.status(201).json({
      success: true,
      message: 'Menu item created successfully and submitted for admin review.',
      data: newItem,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'InternalServerError',
      message: `Failed to create menu item: ${error.message}`,
    });
  }
};

export const getVendorMenuItems = async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.user!.id;
    const items = await MenuItem.find({ vendorId }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: items.length,
      data: items,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'InternalServerError',
      message: `Failed to retrieve vendor menu items: ${error.message}`,
    });
  }
};

export const getMenuItemById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        error: 'BadRequest',
        message: 'Invalid menu item ID format.',
      });
      return;
    }

    const item = await MenuItem.findById(id).populate('vendorId', 'name businessName email image');

    if (!item) {
      res.status(404).json({
        error: 'NotFound',
        message: 'Menu item not found.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: item,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'InternalServerError',
      message: `Failed to retrieve menu item: ${error.message}`,
    });
  }
};

export const updateMenuItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const menuItem = req.menuItem!;
    const { itemName, category, description, price, location, images, status } = req.body;

    if (category && !VALID_CATEGORIES.includes(category)) {
      res.status(400).json({
        error: 'BadRequest',
        message: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`,
      });
      return;
    }

    if (price !== undefined) {
      const parsedPrice = Number(price);
      if (isNaN(parsedPrice) || parsedPrice <= 0) {
        res.status(400).json({
          error: 'BadRequest',
          message: 'Price must be a positive number.',
        });
        return;
      }
      menuItem.price = parsedPrice;
    }

    if (itemName) menuItem.itemName = itemName.trim();
    if (category) menuItem.category = category;
    if (description) menuItem.description = description.trim();
    if (location) menuItem.location = location.trim();
    if (images && Array.isArray(images) && images.length > 0) {
      menuItem.images = images;
    }

    // Status management:
    // Non-admin vendors can toggle to 'inactive' or resubmit to 'pending'
    if (status) {
      if (req.user!.role === 'admin') {
        menuItem.status = status;
      } else if (['inactive', 'pending'].includes(status)) {
        menuItem.status = status;
      }
    }

    const updatedItem = await menuItem.save();

    res.status(200).json({
      success: true,
      message: 'Menu item updated successfully.',
      data: updatedItem,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'InternalServerError',
      message: `Failed to update menu item: ${error.message}`,
    });
  }
};

export const deleteMenuItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await MenuItem.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Menu item deleted successfully.',
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'InternalServerError',
      message: `Failed to delete menu item: ${error.message}`,
    });
  }
};
