import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { rateLimit } from 'express-rate-limit';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './config/auth.js';
import { connectDB } from './config/db.js';
import menuRoutes from './routes/menu.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import orderRoutes from './routes/order.routes.js';
import subscriptionRoutes from './routes/subscription.routes.js';
import webhookRoutes from './routes/webhook.routes.js';
import adminRoutes from './routes/admin.routes.js';
import reviewRoutes from './routes/review.routes.js';
import { notFoundHandler, errorHandler } from './middlewares/error.middleware.js';

dotenv.config();

const app: Application = express();

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:3000')
  .split(',')
  .map((url) => url.trim().replace(/\/$/, ''))
  .concat(['http://localhost:3000', 'http://127.0.0.1:3000']);

// Global Security & Logging Middlewares
const helmetMiddleware = typeof helmet === 'function' ? helmet : ((helmet as any)?.default || helmet);
app.use((helmetMiddleware as any)());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or SSR)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with'],
  })
);
app.use(morgan('dev'));

// Rate Limiting for API Endpoints (500 requests / 15 minutes per IP)
const rateLimitMiddleware = typeof rateLimit === 'function' ? rateLimit : ((rateLimit as any)?.default || rateLimit);
const apiLimiter = (rateLimitMiddleware as any)({
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

// Vercel Serverless Rewrite Path Normalizer
app.use((req: Request, res: Response, next: NextFunction) => {
  const matchedPath = req.headers['x-matched-path'] as string;
  if (matchedPath && req.url === '/api' && matchedPath !== '/api') {
    req.url = matchedPath;
  }
  next();
});

// Root Welcome Endpoints (Responds immediately without waiting on DB)
const welcomeResponse = {
  name: 'PizzaHub API Server',
  version: '1.0.0',
  status: 'running',
  message: 'Welcome to the PizzaHub Multi-Vendor Platform API',
  endpoints: {
    health: '/health',
    auth: '/api/auth',
    menu: '/api/menu',
    orders: '/api/orders',
    subscription: '/api/subscription',
    admin: '/api/admin',
  },
};
app.get('/', (req: Request, res: Response) => {
  res.status(200).json(welcomeResponse);
});
app.get('/api', (req: Request, res: Response) => {
  res.status(200).json(welcomeResponse);
});

// Health Check Endpoints (Available at both /health and /api/health)
const healthHandler = (req: Request, res: Response) => {
  const isConnected = mongoose.connection.readyState === 1;
  res.status(200).json({
    status: 'ok',
    database: isConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'pizzahub-server',
  });
};
app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// Database auto-connection middleware for serverless invocations
app.use(async (req: Request, res: Response, next: NextFunction) => {
  try {
    await connectDB();
  } catch (err: any) {
    console.error('[DB Middleware Notice]', err.message);
  }
  next();
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
const authNodeHandler = toNodeHandler(auth);

app.all('/api/auth/*', (req, res) => {
  return authNodeHandler(req, res);
});

// Application API Routes
app.use('/api/menu', menuRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reviews', reviewRoutes);

// Fallback 404 Handler
app.use(notFoundHandler);

// Centralized Global Error Handler
app.use(errorHandler);

export default app;
