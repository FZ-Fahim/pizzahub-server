import { Router } from 'express';
import {
  getPublicMenuItems,
  createMenuItem,
  getVendorMenuItems,
  getMenuItemById,
  updateMenuItem,
  deleteMenuItem,
} from '../controllers/menu.controller.js';
import { verifyToken, checkNotBlocked, requireRole } from '../middlewares/auth.middleware.js';
import { verifyMenuItemOwnership } from '../middlewares/ownership.middleware.js';

const router = Router();

// Public advanced search, filter, and sort menu query
router.get('/', getPublicMenuItems);

// Vendor-specific item retrieval (must be defined before /:id)
router.get('/vendor', verifyToken, checkNotBlocked, requireRole('vendor'), getVendorMenuItems);

// Single item details
router.get('/:id', getMenuItemById);

// Create item (Vendor only)
router.post('/', verifyToken, checkNotBlocked, requireRole('vendor'), createMenuItem);

// Update item (Owner vendor or Admin)
router.put(
  '/:id',
  verifyToken,
  checkNotBlocked,
  requireRole('vendor', 'admin'),
  verifyMenuItemOwnership,
  updateMenuItem
);

// Delete item (Owner vendor or Admin)
router.delete(
  '/:id',
  verifyToken,
  checkNotBlocked,
  requireRole('vendor', 'admin'),
  verifyMenuItemOwnership,
  deleteMenuItem
);

export default router;
