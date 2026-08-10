import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

import { AppError, Errors } from '../lib/errors.js';

export function notFoundHandler(_req: Request, _res: Response, next: NextFunction) {
  next(Errors.notFound('Endpoint'));
}

/**
 * Single error envelope for the whole API:
 *   { "error": { "code": "DOCTOR_PENDING_APPROVAL", "message": "...", "details": ... } }
 *
 * `code` is the stable contract; `message` is for humans and may be reworded.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  let error: AppError;

  if (err instanceof AppError) {
    error = err;
  } else if (err instanceof ZodError) {
    error = Errors.validation(
      err.issues.map((i) => ({ path: i.path.join('.'), message: i.message }))
    );
  } else {
    // Never leak internals — stack traces and Postgres messages can disclose
    // schema and data. Log server-side, return something opaque.
    console.error('[unhandled]', req.method, req.originalUrl, err);
    error = Errors.internal();
  }

  if (error.status >= 500) {
    console.error('[error]', req.method, req.originalUrl, error);
  }

  res.status(error.status).json({
    error: {
      code: error.code,
      message: error.message,
      ...(error.details !== undefined ? { details: error.details } : {}),
    },
  });
}
