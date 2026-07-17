import { createApplicationPool } from '@mysql-monitor/database';
import { apiConfig } from '../config/env.js';

export const applicationPool = createApplicationPool(apiConfig.APP_DATABASE_URL);
