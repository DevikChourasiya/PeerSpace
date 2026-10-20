import { Router } from 'express';
import {
  getPendingStudents,
  getAllMembers,
  approveStudent,
  rejectStudent,
  suspendUser,
  reactivateUser,
} from '../controllers/admin.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import { UserRole } from '@peerspace/shared';

export const adminRouter = Router();

// All admin routes require an authenticated administrator
adminRouter.use(requireAuth, requireRole(UserRole.ADMIN));

// List endpoints
adminRouter.get('/memberships/pending', getPendingStudents);
adminRouter.get('/users/pending', getPendingStudents); // alias
adminRouter.get('/memberships', getAllMembers);
adminRouter.get('/users', getAllMembers); // alias

// Approve actions
adminRouter.post('/memberships/:id/approve', approveStudent);
adminRouter.patch('/users/:id/approve', approveStudent); // alias

// Reject actions
adminRouter.post('/memberships/:id/reject', rejectStudent);
adminRouter.patch('/users/:id/reject', rejectStudent); // alias

// Suspend actions
adminRouter.post('/memberships/:id/suspend', suspendUser);
adminRouter.patch('/users/:id/suspend', suspendUser); // alias

// Reactivate actions
adminRouter.post('/memberships/:id/reactivate', reactivateUser);
adminRouter.patch('/users/:id/reactivate', reactivateUser); // alias
