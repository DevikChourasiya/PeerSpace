import { Router } from 'express';
import { register, login, logout, getMe } from '../controllers/auth.controller.js';
import { requireAuth, requireRole, requireApprovedMembership } from '../middlewares/auth.js';
import { authRateLimiter } from '../middlewares/rateLimiter.js';
import { UserRole } from '@peerspace/shared';

export const authRouter = Router();

// Public auth endpoints
authRouter.post('/register', authRateLimiter, register);
authRouter.post('/login', authRateLimiter, login);
authRouter.post('/logout', logout);

// Authenticated user profile
authRouter.get('/me', requireAuth, getMe);

// Protected test routes for role and membership verification
authRouter.get('/membership-test', requireAuth, requireApprovedMembership, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Active membership verified. Access granted to student evaluation features.',
    user: req.user,
  });
});

authRouter.get(
  '/instructor-test',
  requireAuth,
  requireRole(UserRole.INSTRUCTOR, UserRole.ADMIN),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Instructor/Admin authorized access granted.',
      user: req.user,
    });
  }
);

authRouter.get('/admin-test', requireAuth, requireRole(UserRole.ADMIN), (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Administrator authorized access granted.',
    user: req.user,
  });
});
