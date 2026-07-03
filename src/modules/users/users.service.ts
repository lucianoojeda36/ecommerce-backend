import { query } from '../../core/database/pool';
import { AppError } from '../../core/middleware/errorHandler';

export class UsersService {
  async findAll(page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const result = await query(
      'SELECT id, name, email, role, avatar_url, phone, is_active, created_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    const count = await query('SELECT COUNT(*) FROM users');
    return {
      users: result.rows,
      total: parseInt(count.rows[0].count),
      page,
      limit,
    };
  }

  async findById(id: string) {
    const result = await query(
      'SELECT id, name, email, role, avatar_url, phone, is_active, created_at FROM users WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      throw new AppError(404, 'Usuario no encontrado');
    }
    return result.rows[0];
  }

  async update(id: string, data: { name?: string; phone?: string; avatar_url?: string }) {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.name) { fields.push(`name = $${idx++}`); values.push(data.name); }
    if (data.phone) { fields.push(`phone = $${idx++}`); values.push(data.phone); }
    if (data.avatar_url) { fields.push(`avatar_url = $${idx++}`); values.push(data.avatar_url); }

    if (fields.length === 0) {
      throw new AppError(400, 'No hay datos para actualizar');
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx}
       RETURNING id, name, email, role, avatar_url, phone, is_active, created_at`,
      values
    );

    if (result.rows.length === 0) {
      throw new AppError(404, 'Usuario no encontrado');
    }

    return result.rows[0];
  }

  async deactivate(id: string) {
    const result = await query(
      `UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1
       RETURNING id, name, email, is_active`,
      [id]
    );
    if (result.rows.length === 0) {
      throw new AppError(404, 'Usuario no encontrado');
    }
    return result.rows[0];
  }
}
