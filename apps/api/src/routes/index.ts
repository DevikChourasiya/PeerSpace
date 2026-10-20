import { Router } from 'express';
import { healthRouter } from './health.route.js';
import { authRouter } from './auth.route.js';
import { adminRouter } from './admin.route.js';
import { directoryRouter } from './directory.route.js';
import { roundRouter } from './round.route.js';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/admin', adminRouter);
apiRouter.use('/students', directoryRouter);
apiRouter.use('/directory', directoryRouter); // alias
apiRouter.use('/rounds', roundRouter);
