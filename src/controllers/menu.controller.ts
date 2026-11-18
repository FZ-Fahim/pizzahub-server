import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { MenuItem, MenuCategory, MenuItemStatus } from '../models/MenuItem.js';

const VALID_CATEGORIES: MenuCategory[] = [
  'Classic Pizzas',
  'Vegetarian Pizzas',
  'Meat Lovers',
  'Specialty / Gourmet Pizzas',
  'Sides & Appetizers',
  'Beverages & Desserts',
];

export const getPublicMenuItems = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      search,
      category,
      location,
      minPrice,
      maxPrice,
      sort = 'newest',
      page = '1',
      limit = '9',
    } = req.query;

    const query: any = {
      status: 'approved', // Strictly approved items
    };

    if (search && typeof search === 'string' && search.trim() !== '') {
      query.itemName = { $regex: search.trim(), $options: 'i' };
    }

    if (category && typeof category === 'string' && category.trim() !== '' && category !== 'All') {
      query.category = category.trim();
    }

    if (location && typeof location === 'string' && location.trim() !== '') {
      query.location = { $regex: location.trim(), $options: 'i' };
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice && !isNaN(Number(minPrice))) {
        query.price.$gte = Number(minPrice);
      }
      if (maxPrice && !isNaN(Number(maxPrice))) {
        query.price.$lte = Number(maxPrice);
      }
    }

    let sortOptions: any = { createdAt: -1 };
    if (sort === 'price_asc') {
      sortOptions = { price: 1 };
    } else if (sort === 'price_desc') {
      sortOptions = { price: -1 };
    } else if (sort === 'oldest') {
      sortOptions = { createdAt: 1 };
    }

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, Math.min(50, parseInt(limit as string, 10) || 9));
    const skip = (pageNum - 1) * limitNum;

    const [items, total] = await Promise.all([
      MenuItem.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .populate('vendorId', 'name businessName image subscriptionPlan'),
      MenuItem.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limitNum);

    res.status(200).json({
      success: true,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
      data: items,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'InternalServerError',
      message: `Failed to retrieve public menu items: ${error.message}`,
    });
  }
};

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

    // Business Rule Guard: Free tier allows maximum 3 active items
    if (req.user!.subscriptionPlan === 'free') {
      const activeCount = await MenuItem.countDocuments({
        vendorId: req.user!.id,
        status: { $ne: 'inactive' },
      });

      if (activeCount >= 3) {
        res.status(403).json({
          error: 'Forbidden',
          message: 'Free plan allows a maximum of 3 active items. Upgrade to Premium for unlimited publishing.',
        });
        return;
      }
    }

    const newItem = await MenuItem.create({
      vendorId: req.user!.id,
      itemName: itemName.trim(),
      category,
      description: description.trim(),
      price: parsedPrice,
      location: location.trim(),
      images,
      status: 'pending',
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

    const item = await MenuItem.findById(id).populate('vendorId', 'name businessName email image subscriptionPlan');

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

    // Status management with Free Tier guard
    if (status) {
      if (req.user!.role === 'admin') {
        menuItem.status = status;
      } else if (['inactive', 'pending'].includes(status)) {
        // If reactivating an inactive item, enforce 3-item limit
        if (status !== 'inactive' && menuItem.status === 'inactive' && req.user!.subscriptionPlan === 'free') {
          const activeCount = await MenuItem.countDocuments({
            vendorId: req.user!.id,
            status: { $ne: 'inactive' },
            _id: { $ne: menuItem._id },
          });

          if (activeCount >= 3) {
            res.status(403).json({
              error: 'Forbidden',
              message: 'Free plan allows a maximum of 3 active items. Upgrade to Premium for unlimited publishing.',
            });
            return;
          }
        }
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
