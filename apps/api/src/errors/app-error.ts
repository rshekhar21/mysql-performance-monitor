export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number,
    public readonly details: unknown[] = []
  ) {
    super(message);
  }
}

export class ValidationError extends AppError {
  constructor(details: unknown[]) {
    super('VALIDATION_ERROR', 'The request is invalid.', 400, details);
  }
}

export class AuthenticationError extends AppError {
  constructor() {
    super('AUTHENTICATION_FAILED', 'Authentication failed.', 401);
  }
}

export class AuthorizationError extends AppError {
  constructor() {
    super('AUTHORIZATION_FAILED', 'You do not have permission to perform this action.', 403);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super('RESOURCE_NOT_FOUND', `${resource} was not found.`, 404);
  }
}

export class DuplicateResourceError extends AppError {
  constructor(resource: string) {
    super('DUPLICATE_RESOURCE', `${resource} already exists.`, 409);
  }
}

export class MonitoredServerUnavailableError extends AppError {
  constructor() {
    super('MONITORED_SERVER_UNAVAILABLE', 'The monitored server is unavailable.', 503);
  }
}
