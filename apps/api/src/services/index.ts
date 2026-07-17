import { apiConfig } from '../config/env.js';
import { applicationPool } from '../db/app-pool.js';
import { AuditLogRepository } from '../repositories/audit-log-repository.js';
import { AlertRepository } from '../repositories/alert-repository.js';
import { MetricsRepository } from '../repositories/metrics-repository.js';
import { MonitoredServerRepository } from '../repositories/monitored-server-repository.js';
import { UserRepository } from '../repositories/user-repository.js';
import { AlertService } from './alert-service.js';
import { AuthService } from './auth-service.js';
import { LiveMySqlService } from './live-mysql-service.js';
import { MetricsService } from './metrics-service.js';
import { MonitoredServerService } from './monitored-server-service.js';

export const userRepository = new UserRepository(applicationPool);
export const monitoredServerRepository = new MonitoredServerRepository(applicationPool);
export const metricsRepository = new MetricsRepository(applicationPool);
export const alertRepository = new AlertRepository(applicationPool);
export const auditLogRepository = new AuditLogRepository(applicationPool);

export const authService = new AuthService(userRepository, apiConfig.JWT_SECRET);
export const monitoredServerService = new MonitoredServerService(monitoredServerRepository);
export const metricsService = new MetricsService(monitoredServerRepository, metricsRepository);
export const liveMySqlService = new LiveMySqlService(monitoredServerRepository);
export const alertService = new AlertService(alertRepository);
