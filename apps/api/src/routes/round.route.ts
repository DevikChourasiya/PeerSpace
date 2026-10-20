import { Router } from 'express';
import { listStudentRounds } from '../controllers/round.controller.js';
import { requireAuth, requireApprovedMembership } from '../middlewares/auth.js';

export const roundRouter = Router();

// Student-accessible round endpoints
roundRouter.use(requireAuth, requireApprovedMembership);

roundRouter.get('/', listStudentRounds);
