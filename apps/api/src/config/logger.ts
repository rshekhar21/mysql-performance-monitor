import pino from 'pino';
import { apiConfig } from './env.js';

const redactPaths = [
  'req.headers.authorization',
  'req.headers.cookie',
  'err.body',
  'password',
  '*.password',
  '*.encryptedPassword',
  '*.encryptedCredentials',
  '*.token',
  '*.authorization',
  '*.cookie'
];

export const logger = pino({
  level: apiConfig.LOG_LEVEL,
  base: {
    service: 'api',
    environment: apiConfig.NODE_ENV
  },
  redact: {
    paths: redactPaths,
    censor: '[REDACTED]'
  }
});
