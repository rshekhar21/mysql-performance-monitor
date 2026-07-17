import { beforeEach, describe, expect, it, vi } from 'vitest';

const createPool = vi.fn();
const loggerWarn = vi.fn();

vi.mock('mysql2/promise', () => ({
  default: {
    createPool
  }
}));

vi.mock('../config/logger.js', () => ({
  logger: {
    warn: loggerWarn
  }
}));

describe('MonitoredPoolManager', () => {
  beforeEach(() => {
    vi.resetModules();
    createPool.mockReset();
    loggerWarn.mockReset();
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('LOG_LEVEL', 'info');
    vi.stubEnv('APP_DATABASE_URL', 'mysql://app:password@localhost:3306/app');
    vi.stubEnv('CREDENTIAL_ENCRYPTION_KEY', '12345678901234567890123456789012');
    vi.stubEnv('JWT_SECRET', '12345678901234567890123456789012');
    vi.stubEnv('MONITORED_MYSQL_CONNECT_TIMEOUT_MS', '15000');
  });

  it('uses the configured monitored mysql timeout for collector pools', async () => {
    createPool.mockReturnValue({
      query: vi.fn().mockResolvedValue([[]]),
      end: vi.fn().mockResolvedValue(undefined)
    });

    const { MonitoredPoolManager } = await import('./monitored-pool-manager.js');
    const manager = new MonitoredPoolManager();
    await manager.query(server(), 'SELECT 1');

    expect(createPool).toHaveBeenCalledWith(
      expect.objectContaining({
        connectTimeout: 15_000
      })
    );
  });

  it('does not log monitored mysql secrets when collector queries fail', async () => {
    createPool.mockReturnValue({
      query: vi
        .fn()
        .mockRejectedValue(Object.assign(new Error('password secret'), { code: 'ETIMEDOUT' })),
      end: vi.fn().mockResolvedValue(undefined)
    });

    const { MonitoredPoolManager } = await import('./monitored-pool-manager.js');
    const manager = new MonitoredPoolManager();

    await expect(manager.query(server(), 'SELECT 1')).rejects.toMatchObject({ code: 'ETIMEDOUT' });

    const logged = JSON.stringify(loggerWarn.mock.calls);
    expect(logged).toContain('ETIMEDOUT');
    expect(logged).not.toContain('secret');
  });
});

function server() {
  return {
    id: 'server-1',
    name: 'Production',
    host: '145.223.21.73',
    port: 3306,
    username: 'mysql_monitor',
    password: 'secret',
    sslMode: 'preferred' as const
  };
}
