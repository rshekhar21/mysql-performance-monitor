import { parseCollectorConfig } from '@mysql-monitor/config';

export const collectorConfig = parseCollectorConfig(process.env);
