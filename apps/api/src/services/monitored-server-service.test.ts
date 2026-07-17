import { beforeEach, describe, expect, it, vi } from 'vitest';

const createConnection = vi.fn();
const loggerWarn = vi.fn();

vi.mock('mysql2/promise', () => ({
  default: {
    createConnection
  }
}));

vi.mock('../config/logger.js', () => ({
  logger: {
    warn: loggerWarn
  }
}));

describe('monitored server mysql connection tests', () => {
  beforeEach(() => {
    vi.resetModules();
    createConnection.mockReset();
    loggerWarn.mockReset();
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('LOG_LEVEL', 'info');
    vi.stubEnv('APP_DATABASE_URL', 'mysql://app:password@localhost:3306/app');
    vi.stubEnv('CREDENTIAL_ENCRYPTION_KEY', '12345678901234567890123456789012');
    vi.stubEnv('JWT_SECRET', '12345678901234567890123456789012');
  });

  it('uses the configured monitored mysql timeout', async () => {
    vi.stubEnv('MONITORED_MYSQL_CONNECT_TIMEOUT_MS', '15000');
    createConnection.mockResolvedValue(connection());

    const { monitoredServerTestInternals } = await import('./monitored-server-service.js');
    await monitoredServerTestInternals.testMysqlConnection(input());

    expect(createConnection).toHaveBeenCalledWith(
      expect.objectContaining({
        connectTimeout: 15_000
      })
    );
  });

  it('maps a 5-second simulated connection delay to a safe unavailable error', async () => {
    vi.stubEnv('MONITORED_MYSQL_CONNECT_TIMEOUT_MS', '5000');
    createConnection.mockImplementation((options: { connectTimeout: number }) => {
      if (options.connectTimeout <= 5_000) {
        return Promise.reject(mysqlError('ETIMEDOUT'));
      }

      return Promise.resolve(connection());
    });

    const { monitoredServerTestInternals } = await import('./monitored-server-service.js');

    await expect(monitoredServerTestInternals.testMysqlConnection(input())).rejects.toMatchObject({
      code: 'MONITORED_SERVER_UNAVAILABLE'
    });
  });

  it('allows a slower connection with the 15-second configuration', async () => {
    vi.stubEnv('MONITORED_MYSQL_CONNECT_TIMEOUT_MS', '15000');
    createConnection.mockImplementation((options: { connectTimeout: number }) => {
      if (options.connectTimeout <= 5_000) {
        return Promise.reject(mysqlError('ETIMEDOUT'));
      }

      return Promise.resolve(connection());
    });

    const { monitoredServerTestInternals } = await import('./monitored-server-service.js');

    await expect(
      monitoredServerTestInternals.testMysqlConnection(input())
    ).resolves.toBeUndefined();
  });

  it('safely maps access-denied errors', async () => {
    vi.stubEnv('MONITORED_MYSQL_CONNECT_TIMEOUT_MS', '15000');
    createConnection.mockRejectedValue(mysqlError('ER_ACCESS_DENIED_ERROR'));

    const { monitoredServerTestInternals } = await import('./monitored-server-service.js');

    await expect(monitoredServerTestInternals.testMysqlConnection(input())).rejects.toMatchObject({
      code: 'MONITORED_SERVER_UNAVAILABLE'
    });
    expect(loggerWarn).toHaveBeenCalledWith(
      expect.objectContaining({ mysqlErrorCode: 'ER_ACCESS_DENIED_ERROR' }),
      'monitored mysql connection failed'
    );
  });

  it('safely maps timeout errors', async () => {
    vi.stubEnv('MONITORED_MYSQL_CONNECT_TIMEOUT_MS', '15000');
    createConnection.mockRejectedValue(mysqlError('ETIMEDOUT'));

    const { monitoredServerTestInternals } = await import('./monitored-server-service.js');

    await expect(monitoredServerTestInternals.testMysqlConnection(input())).rejects.toMatchObject({
      code: 'MONITORED_SERVER_UNAVAILABLE'
    });
    expect(loggerWarn).toHaveBeenCalledWith(
      expect.objectContaining({ mysqlErrorCode: 'ETIMEDOUT' }),
      'monitored mysql connection failed'
    );
  });

  it('falls back to non-TLS when preferred SSL negotiation is unavailable', async () => {
    vi.stubEnv('MONITORED_MYSQL_CONNECT_TIMEOUT_MS', '15000');
    createConnection
      .mockRejectedValueOnce(mysqlError('HANDSHAKE_SSL_ERROR'))
      .mockResolvedValueOnce(connection());

    const { monitoredServerTestInternals } = await import('./monitored-server-service.js');

    await expect(
      monitoredServerTestInternals.testMysqlConnection(input())
    ).resolves.toBeUndefined();
    expect(createConnection).toHaveBeenNthCalledWith(1, expect.objectContaining({ ssl: {} }));
    expect(createConnection).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ ssl: undefined })
    );
  });

  it('does not fall back to non-TLS when SSL is required', async () => {
    vi.stubEnv('MONITORED_MYSQL_CONNECT_TIMEOUT_MS', '15000');
    createConnection.mockRejectedValue(mysqlError('HANDSHAKE_SSL_ERROR'));

    const { monitoredServerTestInternals } = await import('./monitored-server-service.js');

    await expect(
      monitoredServerTestInternals.testMysqlConnection({
        ...input(),
        sslMode: 'required'
      })
    ).rejects.toMatchObject({
      code: 'MONITORED_SERVER_UNAVAILABLE'
    });
    expect(createConnection).toHaveBeenCalledTimes(1);
    expect(createConnection).toHaveBeenCalledWith(expect.objectContaining({ ssl: {} }));
  });

  it('does not log secrets from connection input or mysql errors', async () => {
    vi.stubEnv('MONITORED_MYSQL_CONNECT_TIMEOUT_MS', '15000');
    createConnection.mockRejectedValue(
      Object.assign(new Error('password super-secret token bearer encrypted abc'), {
        code: 'ER_ACCESS_DENIED_ERROR'
      })
    );

    const { monitoredServerTestInternals } = await import('./monitored-server-service.js');

    await expect(monitoredServerTestInternals.testMysqlConnection(input())).rejects.toMatchObject({
      code: 'MONITORED_SERVER_UNAVAILABLE'
    });

    const logged = JSON.stringify(loggerWarn.mock.calls);
    expect(logged).toContain('ER_ACCESS_DENIED_ERROR');
    expect(logged).not.toContain('super-secret');
    expect(logged).not.toContain('bearer');
    expect(logged).not.toContain('encrypted abc');
  });
});

function input() {
  return {
    host: '145.223.21.73',
    port: 3306,
    user: 'mysql_monitor',
    password: 'super-secret',
    sslMode: 'preferred' as const,
    operation: 'api.test_connection',
    monitoredServerHost: '145.223.21.73'
  };
}

function connection() {
  return {
    query: vi.fn().mockResolvedValue([]),
    end: vi.fn().mockResolvedValue(undefined)
  };
}

function mysqlError(code: string): Error & { code: string } {
  return Object.assign(new Error(code), { code });
}
