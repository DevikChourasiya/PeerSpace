import { Router } from 'express';
import { listStudentRounds } from '../controllers/round.controller.js';
import { getQuestionnaireVersionById } from '../controllers/questionnaire.controller.js';
import {
  getRoundRubric,
  getPeerCandidates,
  getPeerSubmission,
  saveSubmissionDraft,
  submitFinalEvaluation,
  updateSubmission,
} from '../controllers/submission.controller.js';
import { requireAuth, requireApprovedMembership } from '../middlewares/auth.js';

export const roundRouter = Router();

// Student-accessible round endpoints (requires authentication and active approved membership)
roundRouter.use(requireAuth, requireApprovedMembership);

roundRouter.get('/', listStudentRounds);
roundRouter.get('/rubrics/versions/:versionId', getQuestionnaireVersionById);
roundRouter.get('/:id/rubric', getRoundRubric);
roundRouter.get('/:id/peers', getPeerCandidates);
roundRouter.get('/:id/submissions/peer/:peerId', getPeerSubmission);
roundRouter.post('/:id/submissions/draft', saveSubmissionDraft);
roundRouter.post('/:id/submissions', submitFinalEvaluation);
roundRouter.put('/:id/submissions/:submissionId', updateSubmission);
