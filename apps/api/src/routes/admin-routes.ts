import { Router } from 'express';
import { AdminController } from '../controllers/admin-controller.js';
import { authenticate, requirePermission } from '../middleware/auth.js';

const controller = new AdminController();
export const userRoutes = Router();
export const auditRoutes = Router();
export const settingsRoutes = Router();

userRoutes.use(authenticate);
auditRoutes.use(authenticate);
settingsRoutes.use(authenticate);

userRoutes.get('/', requirePermission('users:manage'), (req, res, next) => {
  void controller.users(req, res).catch(next);
});

auditRoutes.get('/', requirePermission('audit:read'), (req, res, next) => {
  void controller.auditLogs(req, res).catch(next);
});

settingsRoutes.get('/', requirePermission('settings:manage'), (req, res, next) => {
  void controller.settings(req, res).catch(next);
});
