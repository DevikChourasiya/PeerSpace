import { Router } from 'express';
import {
  getPendingStudents,
  getAllMembers,
  approveStudent,
  rejectStudent,
  suspendUser,
  reactivateUser,
  getAuditLogs,
} from '../controllers/admin.controller.js';
import {
  listQuestionnaires,
  createQuestionnaire,
  getQuestionnaireById,
  updateQuestionnaire,
  duplicateQuestionnaire,
  publishQuestionnaire,
  listQuestionnaireVersions,
  getQuestionnaireVersionById,
} from '../controllers/questionnaire.controller.js';
import {
  listAdminRounds,
  createRound,
  getRoundById,
  updateRound,
  transitionRoundStatus,
  getRoundProgress,
} from '../controllers/round.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import { UserRole } from '@peerspace/shared';

export const adminRouter = Router();

// All admin routes require an authenticated administrator
adminRouter.use(requireAuth, requireRole(UserRole.ADMIN));

// Membership management endpoints
adminRouter.get('/memberships/pending', getPendingStudents);
adminRouter.get('/users/pending', getPendingStudents); // alias
adminRouter.get('/memberships', getAllMembers);
adminRouter.get('/users', getAllMembers); // alias
adminRouter.post('/memberships/:id/approve', approveStudent);
adminRouter.patch('/users/:id/approve', approveStudent); // alias
adminRouter.post('/memberships/:id/reject', rejectStudent);
adminRouter.patch('/users/:id/reject', rejectStudent); // alias
adminRouter.post('/memberships/:id/suspend', suspendUser);
adminRouter.patch('/users/:id/suspend', suspendUser); // alias
adminRouter.post('/memberships/:id/reactivate', reactivateUser);
adminRouter.patch('/users/:id/reactivate', reactivateUser); // alias

// Questionnaire builder endpoints
adminRouter.get('/questionnaires', listQuestionnaires);
adminRouter.post('/questionnaires', createQuestionnaire);
adminRouter.get('/questionnaires/:id', getQuestionnaireById);
adminRouter.put('/questionnaires/:id', updateQuestionnaire);
adminRouter.post('/questionnaires/:id/duplicate', duplicateQuestionnaire);
adminRouter.post('/questionnaires/:id/publish', publishQuestionnaire);
adminRouter.get('/questionnaires/:id/versions', listQuestionnaireVersions);
adminRouter.get('/questionnaires/:id/versions/:versionId', getQuestionnaireVersionById);

// Feedback rounds endpoints
adminRouter.get('/rounds', listAdminRounds);
adminRouter.post('/rounds', createRound);
adminRouter.get('/rounds/:id', getRoundById);
adminRouter.put('/rounds/:id', updateRound);
adminRouter.post('/rounds/:id/status', transitionRoundStatus);
adminRouter.get('/rounds/:id/progress', getRoundProgress);

// Audit logging endpoint
adminRouter.get('/audit-logs', getAuditLogs);
