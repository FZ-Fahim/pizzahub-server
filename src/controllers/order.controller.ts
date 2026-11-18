import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Order, OrderStatus } from '../models/Order.js';
import { MenuItem } from '../models/MenuItem.js';

export const createOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const customer = req.user!;

    // 1. Admin Role Guard: Admins cannot place food orders
    if (customer.role === 'admin') {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Administrators are not permitted to place pizza orders.',
      });
      return;
    }

    const { itemId, deliveryDate, deliveryAddress, message } = req.body;

    // 2. Validate input fields
    if (!itemId || !deliveryDate || !deliveryAddress) {
      res.status(400).json({
        error: 'BadRequest',
        message: 'itemId, deliveryDate, and deliveryAddress are required fields.',
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

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(deliveryDate)) {
      res.status(400).json({
        error: 'BadRequest',
        message: 'deliveryDate must strictly follow YYYY-MM-DD format.',
      });
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (deliveryDate < todayStr) {
      res.status(400).json({
        error: 'BadRequest',
        message: 'Delivery date cannot be in the past.',
      });
      return;
    }

    // 3. Item Existence & Status Guard: Item must exist and be 'approved'
    const menuItem = await MenuItem.findById(itemId);
    if (!menuItem) {
      res.status(404).json({
        error: 'NotFound',
        message: 'Menu item not found.',
      });
      return;
    }

    if (menuItem.status !== 'approved') {
      res.status(400).json({
        error: 'BadRequest',
        message: `Only approved menu items can be ordered. Current item status is '${menuItem.status}'.`,
      });
      return;
    }

    // 4. Self-Order Guard: Vendor cannot order their own product
    if (menuItem.vendorId.toString() === customer.id) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Vendors are not permitted to place orders on their own menu items.',
      });
      return;
    }

    // 5. Duplicate Active Order Guard
    const existingActiveOrder = await Order.findOne({
      customerId: customer.id,
      itemId: menuItem._id,
      deliveryDate,
      status: { $in: ['pending', 'accepted'] },
    });

    if (existingActiveOrder) {
      res.status(409).json({
        error: 'Conflict',
        message: `You already have an active order (status: '${existingActiveOrder.status}') for this pizza on ${deliveryDate}.`,
      });
      return;
    }

    // 6. Create order
    const order = await Order.create({
      itemId: menuItem._id,
      vendorId: menuItem.vendorId,
      customerId: customer.id,
      deliveryDate,
      deliveryAddress: deliveryAddress.trim(),
      message: message ? message.trim() : '',
      status: 'pending',
    });

    const populatedOrder = await Order.findById(order._id)
      .populate('itemId', 'itemName price images category')
      .populate('vendorId', 'name businessName')
      .populate('customerId', 'name email');

    res.status(201).json({
      success: true,
      message: 'Order placed successfully! Waiting for vendor confirmation.',
      data: populatedOrder,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'InternalServerError',
      message: `Failed to place order: ${error.message}`,
    });
  }
};

export const getCustomerOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const customerId = req.user!.id;
    const orders = await Order.find({ customerId })
      .sort({ createdAt: -1 })
      .populate('itemId', 'itemName price images category location')
      .populate('vendorId', 'name businessName email');

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'InternalServerError',
      message: `Failed to retrieve customer orders: ${error.message}`,
    });
  }
};

export const cancelCustomerOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const order = req.order!;

    // Constraint: Allowed ONLY if status is 'pending'
    if (order.status !== 'pending') {
      res.status(400).json({
        error: 'BadRequest',
        message: `Order cannot be cancelled because its current status is '${order.status}'. Only pending orders can be cancelled.`,
      });
      return;
    }

    order.status = 'cancelled';
    const updatedOrder = await order.save();

    res.status(200).json({
      success: true,
      message: 'Order has been cancelled successfully.',
      data: updatedOrder,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'InternalServerError',
      message: `Failed to cancel order: ${error.message}`,
    });
  }
};

export const getVendorOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.user!.id;
    const orders = await Order.find({ vendorId })
      .sort({ createdAt: -1 })
      .populate('itemId', 'itemName price images category location')
      .populate('customerId', 'name email');

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'InternalServerError',
      message: `Failed to retrieve vendor orders: ${error.message}`,
    });
  }
};

export const updateVendorOrderStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const order = req.order!;
    const { status } = req.body;

    if (!status || !['accepted', 'rejected'].includes(status)) {
      res.status(400).json({
        error: 'BadRequest',
        message: "Status must be either 'accepted' or 'rejected'.",
      });
      return;
    }

    // Constraint: Vendor can only accept/reject once while the order is pending
    if (order.status !== 'pending') {
      res.status(400).json({
        error: 'BadRequest',
        message: `Order status has already been finalized as '${order.status}' and cannot be modified.`,
      });
      return;
    }

    order.status = status as OrderStatus;
    const updatedOrder = await order.save();

    res.status(200).json({
      success: true,
      message: `Order has been ${status} successfully.`,
      data: updatedOrder,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'InternalServerError',
      message: `Failed to update order status: ${error.message}`,
    });
  }
};

export const getOrderById = async (req: Request, res: Response): Promise<void> => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('itemId', 'itemName price images category location')
      .populate('vendorId', 'name businessName email')
      .populate('customerId', 'name email');

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'InternalServerError',
      message: `Failed to retrieve order details: ${error.message}`,
    });
  }
};
