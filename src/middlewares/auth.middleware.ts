import { Request, Response, NextFunction } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../config/auth.js';
import { User, UserRole } from '../models/User.js';
import { verifyJwt } from '../utils/jwt.util.js';
import { AuthenticatedUser } from '../types/express.js';

export const verifyToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const cookieHeader = req.headers.cookie;

    if (!authHeader && !cookieHeader) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication token missing. Bearer token or session cookie required.',
      });
      return;
    }

    let token: string | null = null;
    if (authHeader) {
      token = authHeader.startsWith('Bearer ')
        ? authHeader.slice(7).trim()
        : authHeader.trim();
    }

    let userId: string | null = null;

    // 1. Attempt decoding custom JWT
    if (token) {
      const decoded = verifyJwt(token);
      if (decoded && decoded.id) {
        userId = decoded.id;
      }
    }

    // 2. Fallback to Better Auth session validation (checks session cookies and bearer tokens)
    if (!userId) {
      try {
        const session = await auth.api.getSession({
          headers: fromNodeHeaders(req.headers),
        });
        if (session && session.user && session.user.id) {
          userId = session.user.id;
        }
      } catch (authErr) {
        // Continue to unauthorized response
      }
    }

    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired authentication token.',
      });
      return;
    }

    // Verify user existence in database
    const user = await User.findById(userId);

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User account associated with this token does not exist.',
      });
      return;
    }

    req.user = {
      id: user._id.toString(),
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      isBlocked: user.isBlocked,
      businessName: user.businessName,
      subscriptionPlan: user.subscriptionPlan,
      subscriptionExpiresAt: user.subscriptionExpiresAt,
    };

    next();
  } catch (error: any) {
    res.status(500).json({
      error: 'InternalServerError',
      message: `Authentication failed: ${error.message}`,
    });
  }
};

export const requireRole = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required before role verification.',
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        error: 'Forbidden',
        message: `Access denied. Requires one of the following roles: [${roles.join(', ')}]. Current role: '${req.user.role}'.`,
      });
      return;
    }

    next();
  };
};

export const checkNotBlocked = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required before account status verification.',
    });
    return;
  }

  if (req.user.isBlocked) {
    res.status(403).json({
      error: 'Forbidden',
      message: 'Your account has been suspended. Please contact support.',
    });
    return;
  }

  next();
};

