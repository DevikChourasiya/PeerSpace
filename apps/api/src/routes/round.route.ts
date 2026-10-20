import { Router } from 'express';
import { listStudentRounds } from '../controllers/round.controller.js';
import {
  getPeerCandidates,
  getPeerSubmission,
  saveSubmissionDraft,
  submitFinalEvaluation,
  updateSubmission,
} from '../controllers/submission.controller.js';
import { requireAuth, requireApprovedMembership } from '../middlewares/auth.js';

export const roundRouter = Router();

// Student-accessible round endpoints
roundRouter.use(requireAuth, requireApprovedMembership);

roundRouter.get('/', listStudentRounds);
roundRouter.get('/:id/peers', getPeerCandidates);
roundRouter.get('/:id/submissions/peer/:peerId', getPeerSubmission);
roundRouter.post('/:id/submissions/draft', saveSubmissionDraft);
roundRouter.post('/:id/submissions', submitFinalEvaluation);
roundRouter.put('/:id/submissions/:submissionId', updateSubmission);
