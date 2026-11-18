import { Router } from 'express';
import {
  getAdminOverview,
  getAdminUsers,
  toggleUserBlockStatus,
  getAdminMenuItems,
  updateMenuItemStatus,
  deleteAdminMenuItem,
  getAdminTransactions,
} from '../controllers/admin.controller.js';
import { verifyToken, checkNotBlocked, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();

// Apply administrative RBAC guard to all admin endpoints
router.use(verifyToken, checkNotBlocked, requireRole('admin'));

// Platform Analytics Overview
router.get('/overview', getAdminOverview);

// User Moderation
router.get('/users', getAdminUsers);
router.patch('/users/:id/block', toggleUserBlockStatus);

// Menu Moderation & Approval
router.get('/menu', getAdminMenuItems);
router.patch('/menu/:id/status', updateMenuItemStatus);
router.delete('/menu/:id', deleteAdminMenuItem);

// Financial Ledger
router.get('/transactions', getAdminTransactions);

export default router;
