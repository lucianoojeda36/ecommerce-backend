import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    logger.warn('AppError caught:', {
      statusCode: err.statusCode,
      message: err.message,
      details: err.details,
    });
    return res.status(err.statusCode).json({
      error: err.message,
      details: err.details,
    });
  }

  logger.error('Unhandled error:', err);
  return res.status(500).json({
    error: 'Error interno del servidor',
  });
}
