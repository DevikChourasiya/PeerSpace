import { Router } from 'express';
import { getReceivedFeedback, getStudentAnalytics } from '../controllers/feedback.controller.js';
import { reportFeedbackComment } from '../controllers/moderation.controller.js';
import { requireAuth, requireApprovedMembership } from '../middlewares/auth.js';

export const feedbackRouter = Router();

// Student-accessible feedback & analytics endpoints
feedbackRouter.use(requireAuth, requireApprovedMembership);

feedbackRouter.get('/received', getReceivedFeedback);
feedbackRouter.get('/analytics', getStudentAnalytics);
feedbackRouter.post('/reports', reportFeedbackComment);
