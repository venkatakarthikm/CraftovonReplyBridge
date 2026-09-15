// apps/api/src/middleware/errors.ts
// Global error handler and validation helper
import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import pino from 'pino';

const logger = pino({ name: 'api-errors' });

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function notFound(req: Request, res: Response): void {
  res.status(404).json({
    error: { code: 'not_found', message: `Route ${req.method} ${req.path} not found` },
  });
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'validation',
        message: 'Request validation failed',
        details: err.flatten(),
      },
    });
    return;
  }

  // Known app errors
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ err, path: req.path }, 'App error');
    }
    res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }

  // Unknown errors
  logger.error({ err, path: req.path }, 'Unhandled error');
  res.status(500).json({
    error: { code: 'internal_error', message: 'An unexpected error occurred' },
  });
}

/** Validate request body against a Zod schema, throw AppError on failure */
export function validate<T>(schema: { parse: (data: unknown) => T }, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (e) {
    if (e instanceof ZodError) {
      throw new AppError(400, 'validation', 'Request validation failed', e.flatten());
    }
    throw e;
  }
}
