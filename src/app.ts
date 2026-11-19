import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { rateLimit } from 'express-rate-limit';
import { toNodeHandler } from 'better-auth/node';
import { auth, ensureAuthConnected } from './config/auth.js';
import connectDB from './config/db.js';
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

// Required for Vercel/proxies so secure cookies work properly
app.set("trust proxy", 1);

// Global Security & Logging Middlewares
const helmetMiddleware = typeof helmet === 'function' ? helmet : ((helmet as any)?.default || helmet);
app.use((helmetMiddleware as any)());

const allowedOrigins = [
  process.env.CLIENT_URL,
  "https://pizzahub-client-chi.vercel.app",
  "http://localhost:3000",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, serverless)
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith(".vercel.app")) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie", "X-Requested-With"],
    exposedHeaders: ["Set-Cookie"],
  })
);

// Ensure OPTIONS preflight requests pass through cleanly
app.options("*", cors());
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

// Middleware to ensure DB connection is ready on every Vercel serverless invocation
app.use(async (req: Request, res: Response, next: NextFunction) => {
  try {
    await Promise.all([connectDB(), ensureAuthConnected()]);
    next();
  } catch (err) {
    console.error("Database connection failed in serverless middleware:", err);
    res.status(500).json({ error: "Database connection failed" });
  }
});

// Root Welcome Endpoints
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
