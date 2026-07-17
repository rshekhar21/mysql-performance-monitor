import { Router } from 'express';
import { alertRoutes, alertRuleRoutes } from './alert-routes.js';
import { auditRoutes, settingsRoutes, userRoutes } from './admin-routes.js';
import { authRoutes } from './auth-routes.js';
import { serverRoutes } from './server-routes.js';

export const apiRoutes = Router();

apiRoutes.use('/auth', authRoutes);
apiRoutes.use('/servers', serverRoutes);
apiRoutes.use('/alerts', alertRoutes);
apiRoutes.use('/alert-rules', alertRuleRoutes);
apiRoutes.use('/users', userRoutes);
apiRoutes.use('/audit-logs', auditRoutes);
apiRoutes.use('/settings', settingsRoutes);
