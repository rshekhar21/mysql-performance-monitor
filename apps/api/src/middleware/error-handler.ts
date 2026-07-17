import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError, ValidationError } from '../errors/app-error.js';
import { logger } from '../config/logger.js';

export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const appError =
    error instanceof ZodError
      ? new ValidationError(error.issues)
      : error instanceof AppError
        ? error
        : new AppError('INTERNAL_ERROR', 'An unexpected error occurred.', 500);

  if (appError.statusCode >= 500) {
    logger.error({ err: error, requestId: req.requestId }, 'request failed');
  } else {
    logger.warn({ code: appError.code, requestId: req.requestId }, 'request rejected');
  }

  res.status(appError.statusCode).json({
    success: false,
    error: {
      code: appError.code,
      message: appError.message,
      details: appError.details
    },
    requestId: req.requestId
  });
}
