import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { MenuItem } from '../models/MenuItem.js';
import { Order } from '../models/Order.js';
import { Transaction } from '../models/Transaction.js';

export const getAdminOverview = async (req: Request, res: Response): Promise<void> => {
  try {
    const [
      totalUsers,
      totalCustomers,
      totalVendors,
      totalMenuItems,
      pendingMenuItems,
      approvedMenuItems,
      totalOrders,
      revenueResult,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'customer' }),
      User.countDocuments({ role: 'vendor' }),
      MenuItem.countDocuments(),
      MenuItem.countDocuments({ status: 'pending' }),
      MenuItem.countDocuments({ status: 'approved' }),
      Order.countDocuments(),
      Transaction.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalCustomers,
        totalVendors,
        totalMenuItems,
        pendingMenuItems,
        approvedMenuItems,
        totalOrders,
        totalRevenue,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'InternalServerError',
      message: `Failed to fetch admin overview statistics: ${error.message}`,
    });
  }
};

export const getAdminUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { role, search, page = '1', limit = '20' } = req.query;

    const query: any = {};

    if (role && ['customer', 'vendor', 'admin'].includes(role as string)) {
      query.role = role;
    }

    if (search && typeof search === 'string' && search.trim() !== '') {
      query.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { email: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [users, total] = await Promise.all([
      User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      User.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
      data: users,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'InternalServerError',
      message: `Failed to retrieve users: ${error.message}`,
    });
  }
};

export const toggleUserBlockStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        error: 'BadRequest',
        message: 'Invalid user ID format.',
      });
      return;
    }

    if (id === req.user!.id) {
      res.status(400).json({
        error: 'BadRequest',
        message: 'Administrators cannot suspend their own account.',
      });
      return;
    }

    const targetUser = await User.findById(id);

    if (!targetUser) {
      res.status(404).json({
        error: 'NotFound',
        message: 'User account not found.',
      });
      return;
    }

    targetUser.isBlocked = !targetUser.isBlocked;
    await targetUser.save();

    res.status(200).json({
      success: true,
      message: `User ${targetUser.name} (${targetUser.email}) has been ${targetUser.isBlocked ? 'suspended' : 'reactivated'}.`,
      data: targetUser,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'InternalServerError',
      message: `Failed to toggle user block status: ${error.message}`,
    });
  }
};

export const getAdminMenuItems = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, category, search, page = '1', limit = '20' } = req.query;

    const query: any = {};

    if (status && ['pending', 'approved', 'rejected', 'inactive'].includes(status as string)) {
      query.status = status;
    }

    if (category && typeof category === 'string' && category !== 'All') {
      query.category = category;
    }

    if (search && typeof search === 'string' && search.trim() !== '') {
      query.itemName = { $regex: search.trim(), $options: 'i' };
    }

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [items, total] = await Promise.all([
      MenuItem.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('vendorId', 'name businessName email image subscriptionPlan'),
      MenuItem.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
      data: items,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'InternalServerError',
      message: `Failed to retrieve menu items: ${error.message}`,
    });
  }
};

export const updateMenuItemStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        error: 'BadRequest',
        message: 'Invalid menu item ID format.',
      });
      return;
    }

    if (!status || !['approved', 'rejected', 'pending', 'inactive'].includes(status)) {
      res.status(400).json({
        error: 'BadRequest',
        message: "Status must be 'approved', 'rejected', 'pending', or 'inactive'.",
      });
      return;
    }

    const menuItem = await MenuItem.findById(id);

    if (!menuItem) {
      res.status(404).json({
        error: 'NotFound',
        message: 'Menu item not found.',
      });
      return;
    }

    menuItem.status = status;
    const updated = await menuItem.save();

    res.status(200).json({
      success: true,
      message: `Menu item '${updated.itemName}' status updated to '${status}'.`,
      data: updated,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'InternalServerError',
      message: `Failed to update menu item status: ${error.message}`,
    });
  }
};

export const deleteAdminMenuItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        error: 'BadRequest',
        message: 'Invalid menu item ID format.',
      });
      return;
    }

    const item = await MenuItem.findByIdAndDelete(id);

    if (!item) {
      res.status(404).json({
        error: 'NotFound',
        message: 'Menu item not found.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: `Menu item '${item.itemName}' was deleted by admin moderation.`,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'InternalServerError',
      message: `Failed to delete menu item: ${error.message}`,
    });
  }
};

export const getAdminTransactions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '20' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [transactions, total] = await Promise.all([
      Transaction.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('vendorId', 'name businessName email'),
      Transaction.countDocuments(),
    ]);

    res.status(200).json({
      success: true,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
      data: transactions,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'InternalServerError',
      message: `Failed to retrieve transactions: ${error.message}`,
    });
  }
};
