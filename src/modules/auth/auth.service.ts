import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../../core/database/pool';
import { config } from '../../core/config';
import { AppError } from '../../core/middleware/errorHandler';
import { AuthPayload } from '../../core/middleware/auth';
import { logger } from '../../core/logger';

export class AuthService {
  async register(name: string, email: string, password: string) {
    logger.info('Registering new user', { name, email });
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      logger.warn('Registration failed: email already exists', { email });
      throw new AppError(409, 'El email ya está registrado');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'customer')
       RETURNING id, name, email, role, created_at`,
      [name, email, passwordHash]
    );

    const user = result.rows[0];
    const token = this.generateToken(user);
    logger.info('User registered successfully', { userId: user.id, email });

    return { user, token };
  }

  async login(email: string, password: string) {
    logger.info('User login attempt', { email });
    const result = await query(
      'SELECT id, name, email, password_hash, role, is_active FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      logger.warn('Login failed: user not found', { email });
      throw new AppError(401, 'Credenciales inválidas');
    }

    const user = result.rows[0];
    if (!user.is_active) {
      logger.warn('Login failed: account deactivated', { email, userId: user.id });
      throw new AppError(401, 'Cuenta desactivada');
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      logger.warn('Login failed: invalid password', { email, userId: user.id });
      throw new AppError(401, 'Credenciales inválidas');
    }

    const token = this.generateToken(user);
    const { password_hash, ...safeUser } = user;
    logger.info('User logged in successfully', { userId: user.id, email });

    return { user: safeUser, token };
  }

  private generateToken(user: { id: string; email: string; role: string }): string {
    const payload: AuthPayload = {
      userId: user.id,
      email: user.email,
      role: user.role as 'customer' | 'admin',
    };
    return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn as any });
  }
}
