import pino from 'pino';
import { collectorConfig } from './env.js';

export const logger = pino({
  level: collectorConfig.LOG_LEVEL,
  base: {
    service: 'collector',
    environment: collectorConfig.NODE_ENV
  },
  redact: {
    paths: [
      '*.password',
      '*.encryptedPassword',
      '*.encryptedCredentials',
      '*.token',
      '*.authorization',
      '*.cookie'
    ],
    censor: '[REDACTED]'
  }
});
