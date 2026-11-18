import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './config/auth';
import menuRoutes from './routes/menu.routes';
import uploadRoutes from './routes/upload.routes';
import orderRoutes from './routes/order.routes';
import subscriptionRoutes from './routes/subscription.routes';
import webhookRoutes from './routes/webhook.routes';
import adminRoutes from './routes/admin.routes';
import { notFoundHandler, errorHandler } from './middlewares/error.middleware';

dotenv.config();

const app: Application = express();

const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';

// Global Security & Logging Middlewares
app.use(helmet());
app.use(
  cors({
    origin: clientUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with'],
  })
);
app.use(morgan('dev'));

// Rate Limiting for API Endpoints (500 requests / 15 minutes per IP)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'TooManyRequests',
    message: 'Too many requests from this IP address. Please try again after 15 minutes.',
  },
});
app.use('/api', apiLimiter);

// Note: Stripe webhook endpoint requires raw body parser before express.json() is applied
app.use((req, res, next) => {
  if (req.originalUrl === '/api/webhook/stripe') {
    next();
  } else {
    express.json()(req, res, next);
  }
});
app.use(express.urlencoded({ extended: true }));

// Health Check Endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'pizzahub-server',
  });
});

// Security Guard: Reject role: 'admin' on public registration requests
app.use('/api/auth', (req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'POST') {
    const requestedRole = req.body?.role || req.body?.data?.role;
    if (requestedRole === 'admin') {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Self-assignment of the admin role during public registration is strictly prohibited.',
      });
      return;
    }
  }
  next();
});

// Mount Better Auth handler
app.all('/api/auth/*', toNodeHandler(auth));

// Application API Routes
app.use('/api/menu', menuRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/admin', adminRoutes);

// Fallback 404 Handler
app.use(notFoundHandler);

// Centralized Global Error Handler
app.use(errorHandler);

export default app;
