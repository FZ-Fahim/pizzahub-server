import { IUser, UserRole, SubscriptionPlan } from '../models/User';
import { IMenuItem } from '../models/MenuItem';
import { IOrder } from '../models/Order';

export interface AuthenticatedUser {
  id: string;
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  isBlocked: boolean;
  businessName?: string;
  subscriptionPlan: SubscriptionPlan;
  subscriptionExpiresAt?: Date;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      menuItem?: IMenuItem;
      order?: IOrder;
    }
  }
}
