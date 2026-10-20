import type { Request, Response, NextFunction } from 'express';
import { RegisterRequestSchema, LoginRequestSchema, UserRole, UserStatus } from '@peerspace/shared';
import { User } from '../models/user.model.js';

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parseResult = RegisterRequestSchema.safeParse(req.body);

    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid registration details provided.',
          details: parseResult.error.format(),
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    const { name, email, password } = parseResult.data;

    // Check for duplicate email (case-insensitive)
    const existingUser = await User.findOne({ email }).lean();
    if (existingUser) {
      res.status(409).json({
        success: false,
        error: {
          code: 'EMAIL_ALREADY_EXISTS',
          message: 'An account with this email address already exists.',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // Hash password with bcrypt
    const passwordHash = await User.hashPassword(password);

    // Enforce student role and pending membership regardless of incoming payload
    const newUser = new User({
      name,
      email,
      passwordHash,
      role: UserRole.STUDENT,
      status: UserStatus.PENDING,
    });

    await newUser.save();

    res.status(201).json({
      success: true,
      message:
        'Student account registered successfully. Account membership is pending approval by an administrator or instructor.',
      user: newUser.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parseResult = LoginRequestSchema.safeParse(req.body);

    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid login details provided.',
          details: parseResult.error.format(),
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    const { email, password } = parseResult.data;

    // Find user including passwordHash
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password.',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password.',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // Regenerate session upon login to prevent session fixation attacks
    req.session.regenerate((regenErr) => {
      if (regenErr) {
        return next(regenErr);
      }

      req.session.userId = user._id.toString();
      req.session.role = user.role;
      req.session.status = user.status;

      req.session.save((saveErr) => {
        if (saveErr) {
          return next(saveErr);
        }

        res.status(200).json({
          success: true,
          message: 'Logged in successfully.',
          user: user.toJSON(),
        });
      });
    });
  } catch (error) {
    next(error);
  }
};

export const logout = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.session) {
    res.status(200).json({
      success: true,
      message: 'Logged out successfully.',
    });
    return;
  }

  req.session.destroy((err) => {
    if (err) {
      return next(err);
    }

    res.clearCookie('peerspace.sid');
    res.status(200).json({
      success: true,
      message: 'Logged out successfully.',
    });
  });
};

export const getMe = (req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    user: req.user,
  });
};
