import jwt from 'jsonwebtoken';
import { UserRole } from '../models/User';

export interface JwtPayload {
  id: string;
  email: string;
  role: UserRole;
  name?: string;
}

const JWT_SECRET = process.env.JWT_SECRET || 'pizzahub_custom_jwt_secret_token_key_here_super_safe';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export const signToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as jwt.SignOptions);
};

export const verifyJwt = (token: string): JwtPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch (error) {
    return null;
  }
};
