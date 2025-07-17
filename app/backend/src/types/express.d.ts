import { Request } from 'express';

interface User {
  id: string;
  email: string;
  username?: string;
  fullName?: string;
  avatarUrl?: string;
  githubProfile?: any;
  emailVerifiedAt?: Date | undefined;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  subscriptionTier: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: User;
      rawBody?: string;
      token?: string;
    }
  }
}