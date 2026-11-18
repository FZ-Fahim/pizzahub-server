import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { MenuItem } from '../models/MenuItem.js';
import { Order } from '../models/Order.js';

export const verifyMenuItemOwnership = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required for resource ownership verification.',
      });
      return;
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        error: 'BadRequest',
        message: 'Invalid menu item ID format.',
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

    // Admins have override privileges, vendors must own the item
    if (req.user.role !== 'admin' && menuItem.vendorId.toString() !== req.user.id) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied. You do not own this menu item.',
      });
      return;
    }

    req.menuItem = menuItem;
    next();
  } catch (error: any) {
    res.status(500).json({
      error: 'InternalServerError',
      message: `Failed to verify menu item ownership: ${error.message}`,
    });
  }
};

export const verifyOrderOwnership = (roleCheck: 'vendor' | 'customer' | 'either' = 'either') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required for order ownership verification.',
        });
        return;
      }

      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          error: 'BadRequest',
          message: 'Invalid order ID format.',
        });
        return;
      }

      const order = await Order.findById(id);

      if (!order) {
        res.status(404).json({
          error: 'NotFound',
          message: 'Order not found.',
        });
        return;
      }

      const isVendorOwner = order.vendorId.toString() === req.user.id;
      const isCustomerOwner = order.customerId.toString() === req.user.id;
      const isAdmin = req.user.role === 'admin';

      let isAuthorized = false;

      if (isAdmin) {
        isAuthorized = true;
      } else if (roleCheck === 'vendor') {
        isAuthorized = isVendorOwner;
      } else if (roleCheck === 'customer') {
        isAuthorized = isCustomerOwner;
      } else {
        isAuthorized = isVendorOwner || isCustomerOwner;
      }

      if (!isAuthorized) {
        res.status(403).json({
          error: 'Forbidden',
          message: 'Access denied. You do not have permission to access or modify this order.',
        });
        return;
      }

      req.order = order;
      next();
    } catch (error: any) {
      res.status(500).json({
        error: 'InternalServerError',
        message: `Failed to verify order ownership: ${error.message}`,
      });
    }
  };
};
