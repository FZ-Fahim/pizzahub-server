import { Router } from 'express';
import { createOrder } from '../controllers/order.controller';
import { verifyToken, checkNotBlocked } from '../middlewares/auth.middleware';

const router = Router();

// Order creation endpoint (Guarded against admins and self-ordering)
router.post('/', verifyToken, checkNotBlocked, createOrder);

export default router;
