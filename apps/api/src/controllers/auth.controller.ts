import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import {
  RegisterRequestSchema,
  LoginRequestSchema,
  VerifyEmailRequestSchema,
  ResendVerificationRequestSchema,
  UserRole,
  UserStatus,
} from '@peerspace/shared';
import { User } from '../models/user.model.js';
import { sendVerificationEmail } from '../services/email.service.js';

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

    // Generate cryptographically secure single-use email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(verificationToken).digest('hex');
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Enforce student role, unverified email, and pending membership status
    const newUser = new User({
      name,
      email,
      passwordHash,
      role: UserRole.STUDENT,
      status: UserStatus.PENDING,
      isEmailVerified: false,
      emailVerificationTokenHash: tokenHash,
      emailVerificationExpires: tokenExpiry,
      emailVerificationSentAt: new Date(),
    });

    // Attempt to deliver the verification email
    try {
      await sendVerificationEmail(email, name, verificationToken);
    } catch (_deliveryError) {
      res.status(502).json({
        success: false,
        error: {
          code: 'EMAIL_DELIVERY_FAILED',
          message:
            'Failed to deliver the verification email. Please verify your email address and try registering again.',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    await newUser.save();

    res.status(201).json({
      success: true,
      message:
        'Student account registered successfully. A verification link has been sent to your email. Account membership is pending approval by an administrator once verified.',
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
      req.session.isEmailVerified =
        user.isEmailVerified ?? (user.status === UserStatus.ACTIVE || user.role === UserRole.ADMIN);

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

export const verifyEmail = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const rawToken =
      typeof req.body?.token === 'string'
        ? req.body.token
        : typeof req.query?.token === 'string'
          ? req.query.token
          : '';

    const parseResult = VerifyEmailRequestSchema.safeParse({ token: rawToken });

    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'A valid email verification token is required.',
          details: parseResult.error.format(),
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    const { token } = parseResult.data;
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      emailVerificationTokenHash: tokenHash,
    });

    if (!user) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'The email verification link is invalid, expired, or has already been used.',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // Check token expiry
    if (user.emailVerificationExpires && user.emailVerificationExpires < new Date()) {
      res.status(400).json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message:
            'The email verification link has expired. Please request a new verification link.',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // Invalidate token and mark as verified
    user.isEmailVerified = true;
    user.emailVerificationTokenHash = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    // If currently logged in, update session state
    if (req.session && req.session.userId === user._id.toString()) {
      req.session.isEmailVerified = true;
    }

    res.status(200).json({
      success: true,
      message:
        'Your university email address has been successfully verified. Your account is now pending administrator approval.',
      user: user.toJSON(),
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const resendVerification = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parseResult = ResendVerificationRequestSchema.safeParse(req.body);

    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Please provide a valid university email address.',
          details: parseResult.error.format(),
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    const { email } = parseResult.data;
    const user = await User.findOne({ email });

    if (!user) {
      res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'No registered student account was found for this email address.',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    if (user.isEmailVerified) {
      res.status(400).json({
        success: false,
        error: {
          code: 'ALREADY_VERIFIED',
          message: 'This email address has already been verified.',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // Cooldown check (60 seconds)
    const cooldownMs = 60 * 1000;
    if (user.emailVerificationSentAt) {
      const elapsed = Date.now() - new Date(user.emailVerificationSentAt).getTime();
      if (elapsed < cooldownMs) {
        const waitSecs = Math.ceil((cooldownMs - elapsed) / 1000);
        res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `Please wait ${waitSecs} second${waitSecs === 1 ? '' : 's'} before requesting another verification email.`,
          },
          meta: {
            retryAfterSeconds: waitSecs,
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }
    }

    // Generate new token & send email
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(verificationToken).digest('hex');
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    user.emailVerificationTokenHash = tokenHash;
    user.emailVerificationExpires = tokenExpiry;
    user.emailVerificationSentAt = new Date();

    try {
      await sendVerificationEmail(user.email, user.name, verificationToken);
    } catch (_deliveryError) {
      res.status(502).json({
        success: false,
        error: {
          code: 'EMAIL_DELIVERY_FAILED',
          message: 'Failed to deliver the verification email. Please try again later.',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'A fresh verification link has been sent to your university email address.',
      meta: {
        timestamp: new Date().toISOString(),
      },
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
