export type MonitoredMysqlSslMode = 'disabled' | 'preferred' | 'required';

export interface MonitoredMysqlConnectionAttempt {
  ssl?: Record<string, never>;
  sslEnabled: boolean;
}

export interface SanitizedMysqlError {
  code: string;
}

const SSL_ERROR_CODES = new Set([
  'HANDSHAKE_SSL_ERROR',
  'ERR_SSL_SSLV3_ALERT_HANDSHAKE_FAILURE',
  'ERR_SSL_WRONG_VERSION_NUMBER',
  'ERR_SSL_UNKNOWN_PROTOCOL',
  'ERR_SSL_TLSV1_ALERT_PROTOCOL_VERSION',
  'PROTOCOL_CONNECTION_LOST'
]);

export function monitoredMysqlConnectionAttempts(
  sslMode: MonitoredMysqlSslMode
): MonitoredMysqlConnectionAttempt[] {
  if (sslMode === 'disabled') {
    return [{ sslEnabled: false }];
  }

  const tlsAttempt = { ssl: {}, sslEnabled: true };

  if (sslMode === 'required') {
    return [tlsAttempt];
  }

  return [tlsAttempt, { sslEnabled: false }];
}

export function shouldRetryWithoutSsl(
  sslMode: MonitoredMysqlSslMode,
  error: unknown,
  attemptIndex: number
): boolean {
  return sslMode === 'preferred' && attemptIndex === 0 && isSslNegotiationError(error);
}

export function sanitizeMysqlError(error: unknown): SanitizedMysqlError {
  return { code: mysqlErrorCode(error) };
}

export function mysqlErrorCode(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code?: unknown }).code;

    if (typeof code === 'string' && code.length > 0) {
      return code;
    }
  }

  return 'UNKNOWN_MYSQL_ERROR';
}

function isSslNegotiationError(error: unknown): boolean {
  const code = mysqlErrorCode(error);

  if (SSL_ERROR_CODES.has(code)) {
    return true;
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = String((error as { message?: unknown }).message).toLowerCase();
    return message.includes('ssl') || message.includes('tls');
  }

  return false;
}
