import { Router } from 'express';
import {
  createOrder,
  getCustomerOrders,
  cancelCustomerOrder,
  getVendorOrders,
  updateVendorOrderStatus,
  getOrderById,
} from '../controllers/order.controller';
import { verifyToken, checkNotBlocked, requireRole } from '../middlewares/auth.middleware';
import { verifyOrderOwnership } from '../middlewares/ownership.middleware';

const router = Router();

// Customer orders endpoints
router.get('/customer', verifyToken, checkNotBlocked, getCustomerOrders);
router.patch(
  '/:id/cancel',
  verifyToken,
  checkNotBlocked,
  verifyOrderOwnership('customer'),
  cancelCustomerOrder
);

// Vendor orders endpoints
router.get(
  '/vendor',
  verifyToken,
  checkNotBlocked,
  requireRole('vendor'),
  getVendorOrders
);
router.patch(
  '/:id/status',
  verifyToken,
  checkNotBlocked,
  requireRole('vendor'),
  verifyOrderOwnership('vendor'),
  updateVendorOrderStatus
);

// Create order
router.post('/', verifyToken, checkNotBlocked, createOrder);

// Single order details (Customer or Vendor of the order, or Admin)
router.get(
  '/:id',
  verifyToken,
  checkNotBlocked,
  verifyOrderOwnership('either'),
  getOrderById
);

export default router;
