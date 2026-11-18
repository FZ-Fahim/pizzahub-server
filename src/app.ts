import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './config/auth';
import menuRoutes from './routes/menu.routes';
import uploadRoutes from './routes/upload.routes';

dotenv.config();

const app: Application = express();

const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';

// Global Middlewares
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
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Self-assignment of the admin role during public registration is strictly prohibited.',
      });
    }
  }
  next();
});

// Mount Better Auth handler
app.all('/api/auth/*', toNodeHandler(auth));

// Application API Routes
app.use('/api/menu', menuRoutes);
app.use('/api/upload', uploadRoutes);

export default app;
