import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = req.requestId;
  console.error(`[Error] Request ${requestId} failed:`, err);

  if (err instanceof ZodError) {
    res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'Invalid request input data.',
      errors: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
      requestId,
    });
    return;
  }

  const statusCode = err.status || err.statusCode || 500;
  let code = err.code || 'INTERNAL_SERVER_ERROR';

  if (statusCode === 409) code = 'CONCURRENCY_CONFLICT';
  if (statusCode === 403) code = 'FORBIDDEN';
  if (statusCode === 401) code = 'UNAUTHORIZED';
  if (statusCode === 404) code = 'NOT_FOUND';

  res.status(statusCode).json({
    code,
    message: err.message || 'An unexpected error occurred.',
    requestId,
  });
}
