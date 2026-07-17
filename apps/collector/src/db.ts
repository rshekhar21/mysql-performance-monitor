import { createApplicationPool } from '@mysql-monitor/database';
import { collectorConfig } from './config/env.js';

export const applicationPool = createApplicationPool(collectorConfig.APP_DATABASE_URL);
