import { Router } from 'express';
import { getStudentDirectory } from '../controllers/directory.controller.js';
import { requireAuth, requireApprovedMembership } from '../middlewares/auth.js';

export const directoryRouter = Router();

// Student directory is accessible to all authenticated, approved members
directoryRouter.use(requireAuth, requireApprovedMembership);

directoryRouter.get('/', getStudentDirectory);
