import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger } from '../logger';
import { generateRequestId } from '../logger';

export interface AuthPayload {
  userId: string;
  email: string;
  role: 'customer' | 'admin';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const requestId = generateRequestId();
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    logger.warn('Authentication failed: token not provided', { requestId, path: req.path });
    return res.status(401).json({ error: 'Token requerido' });
  }

  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, config.jwt.secret) as AuthPayload;
    req.user = payload;
    logger.info('User authenticated successfully', { requestId, userId: payload.userId, email: payload.email, path: req.path });
    next();
  } catch (error) {
    logger.error('Authentication error', { requestId, path: req.path, error });
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado: se requiere rol admin' });
  }
  next();
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    const token = header.split(' ')[1];
    try {
      const payload = jwt.verify(token, config.jwt.secret) as AuthPayload;
      req.user = payload;
    } catch {
      // token inválido, seguir sin auth
    }
  }
  next();
}
