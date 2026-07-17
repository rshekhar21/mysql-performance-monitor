import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { loginSchema } from '@mysql-monitor/validation';
import { apiConfig } from '../config/env.js';
import { AuthController } from '../controllers/auth-controller.js';
import { authenticate } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const controller = new AuthController();
export const authRoutes = Router();

const authLimiter = rateLimit({
  windowMs: apiConfig.AUTH_RATE_LIMIT_WINDOW_MS,
  limit: apiConfig.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false
});

authRoutes.post('/login', authLimiter, validateBody(loginSchema), (req, res, next) => {
  void controller.login(req, res).catch(next);
});
authRoutes.post('/logout', authenticate, (req, res) => controller.logout(req, res));
authRoutes.get('/me', authenticate, (req, res) => controller.me(req, res));
