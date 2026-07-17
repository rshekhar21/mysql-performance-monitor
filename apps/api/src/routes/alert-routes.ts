import { Router } from 'express';
import { alertRuleCreateSchema, alertRuleUpdateSchema } from '@mysql-monitor/validation';
import { AlertController } from '../controllers/alert-controller.js';
import { authenticate, requirePermission } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const controller = new AlertController();

export const alertRoutes = Router();
export const alertRuleRoutes = Router();

alertRoutes.use(authenticate);
alertRoutes.get('/', requirePermission('dashboard:read'), (req, res, next) => {
  void controller.listEvents(req, res).catch(next);
});
alertRoutes.post(
  '/:alertId/acknowledge',
  requirePermission('alerts:acknowledge'),
  (req, res, next) => {
    void controller.acknowledge(req, res).catch(next);
  }
);

alertRuleRoutes.use(authenticate);
alertRuleRoutes.get('/', requirePermission('alerts:manage'), (req, res, next) => {
  void controller.listRules(req, res).catch(next);
});
alertRuleRoutes.post(
  '/',
  requirePermission('alerts:manage'),
  validateBody(alertRuleCreateSchema),
  (req, res, next) => {
    void controller.createRule(req, res).catch(next);
  }
);
alertRuleRoutes.patch(
  '/:ruleId',
  requirePermission('alerts:manage'),
  validateBody(alertRuleUpdateSchema),
  (req, res, next) => {
    void controller.updateRule(req, res).catch(next);
  }
);
alertRuleRoutes.delete('/:ruleId', requirePermission('alerts:manage'), (req, res, next) => {
  void controller.deleteRule(req, res).catch(next);
});
