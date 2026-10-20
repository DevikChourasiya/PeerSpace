import type { Request, Response, NextFunction } from 'express';
import { UserRole, UserStatus } from '@peerspace/shared';
import { User } from '../models/user.model.js';

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.session || !req.session.userId) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required. Please log in to access this resource.',
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  try {
    const user = await User.findById(req.session.userId).lean();

    if (!user) {
      req.session.destroy(() => {});
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'The user account associated with this session no longer exists.',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    req.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    };

    next();
  } catch (error) {
    next(error);
  }
};

export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required.',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. Requires one of the following roles: [${allowedRoles.join(', ')}]`,
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    next();
  };
};

export const requireApprovedMembership = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required.',
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  if (req.user.status === UserStatus.PENDING) {
    res.status(403).json({
      success: false,
      error: {
        code: 'MEMBERSHIP_PENDING',
        message:
          'Your account membership is currently pending approval by an instructor or administrator.',
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  if (req.user.status === UserStatus.SUSPENDED) {
    res.status(403).json({
      success: false,
      error: {
        code: 'ACCOUNT_SUSPENDED',
        message: 'Your account has been suspended. Please contact system administrators.',
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  next();
};
