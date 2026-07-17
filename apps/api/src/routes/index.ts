import { Router } from 'express';
import { alertRoutes, alertRuleRoutes } from './alert-routes.js';
import { authRoutes } from './auth-routes.js';
import { serverRoutes } from './server-routes.js';

export const apiRoutes = Router();

apiRoutes.use('/auth', authRoutes);
apiRoutes.use('/servers', serverRoutes);
apiRoutes.use('/alerts', alertRoutes);
apiRoutes.use('/alert-rules', alertRuleRoutes);
