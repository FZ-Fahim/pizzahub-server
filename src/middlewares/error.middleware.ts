import { Request, Response, NextFunction } from 'express';

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    error: 'NotFound',
    message: `Resource not found on path: ${req.method} ${req.originalUrl}`,
  });
};

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error(`[Error] Unhandled exception: ${err.message}`, err.stack);

  const statusCode = err.status || err.statusCode || 500;
  const isDev = process.env.NODE_ENV === 'development';

  res.status(statusCode).json({
    error: err.name || 'InternalServerError',
    message: err.message || 'An unexpected internal server error occurred.',
    ...(isDev && { stack: err.stack }),
  });
};
