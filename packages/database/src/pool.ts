import mysql from 'mysql2/promise';

export function createApplicationPool(databaseUrl: string): mysql.Pool {
  return mysql.createPool({
    uri: databaseUrl,
    waitForConnections: false,
    connectionLimit: 10,
    maxIdle: 5,
    idleTimeout: 60_000,
    enableKeepAlive: true,
    queueLimit: 0,
    timezone: 'Z',
    namedPlaceholders: true
  });
}

export type ApplicationPool = mysql.Pool;
