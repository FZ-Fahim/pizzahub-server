import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

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

// Note: Stripe webhook endpoint requires express.raw body parser before express.json() is applied globally
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

export default app;
