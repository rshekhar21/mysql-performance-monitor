import { describe, expect, it } from 'vitest';
import { parseApiConfig } from './index.js';

describe('config validation', () => {
  it('defaults monitored mysql connect timeout to 15 seconds', () => {
    const config = parseApiConfig({
      NODE_ENV: 'production',
      APP_DATABASE_URL: 'mysql://app:password@localhost:3306/app',
      CREDENTIAL_ENCRYPTION_KEY: '12345678901234567890123456789012',
      JWT_SECRET: '12345678901234567890123456789012'
    });

    expect(config.MONITORED_MYSQL_CONNECT_TIMEOUT_MS).toBe(15_000);
  });

  it('validates monitored mysql connect timeout values', () => {
    expect(() =>
      parseApiConfig({
        NODE_ENV: 'production',
        APP_DATABASE_URL: 'mysql://app:password@localhost:3306/app',
        CREDENTIAL_ENCRYPTION_KEY: '12345678901234567890123456789012',
        JWT_SECRET: '12345678901234567890123456789012',
        MONITORED_MYSQL_CONNECT_TIMEOUT_MS: '999'
      })
    ).toThrow();
  });
});
