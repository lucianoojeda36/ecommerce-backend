import { query } from '../../core/database/pool';
import { AppError } from '../../core/middleware/errorHandler';
import { logger } from '../../core/logger';

export class AddressesService {
  async findByUser(userId: string) {
    logger.info('Fetching addresses for user', { userId });
    const result = await query(
      'SELECT * FROM addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC',
      [userId]
    );
    logger.info('Addresses fetched successfully', { userId, count: result.rows.length });
    return result.rows;
  }

  async create(userId: string, data: {
    label?: string;
    street: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city: string;
    state: string;
    zip_code?: string;
    country?: string;
    is_default?: boolean;
  }) {
    logger.info('Creating new address', { userId, label: data.label, city: data.city });
    if (data.is_default) {
      await query('UPDATE addresses SET is_default = false WHERE user_id = $1', [userId]);
    }

    const result = await query(
      `INSERT INTO addresses (user_id, label, street, number, complement, neighborhood, city, state, zip_code, country, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        userId, data.label || null, data.street, data.number || null,
        data.complement || null, data.neighborhood || null,
        data.city, data.state, data.zip_code || null,
        data.country || 'Argentina', data.is_default || false,
      ]
    );
    logger.info('Address created successfully', { userId, addressId: result.rows[0].id });
    return result.rows[0];
  }

  async update(id: string, userId: string, data: any) {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.label !== undefined) { fields.push(`label = $${idx++}`); values.push(data.label); }
    if (data.street) { fields.push(`street = $${idx++}`); values.push(data.street); }
    if (data.number !== undefined) { fields.push(`number = $${idx++}`); values.push(data.number); }
    if (data.complement !== undefined) { fields.push(`complement = $${idx++}`); values.push(data.complement); }
    if (data.neighborhood !== undefined) { fields.push(`neighborhood = $${idx++}`); values.push(data.neighborhood); }
    if (data.city) { fields.push(`city = $${idx++}`); values.push(data.city); }
    if (data.state) { fields.push(`state = $${idx++}`); values.push(data.state); }
    if (data.zip_code !== undefined) { fields.push(`zip_code = $${idx++}`); values.push(data.zip_code); }
    if (data.country) { fields.push(`country = $${idx++}`); values.push(data.country); }

    if (data.is_default) {
      await query('UPDATE addresses SET is_default = false WHERE user_id = $1', [userId]);
      fields.push(`is_default = true`);
    }

    if (fields.length === 0) {
      throw new AppError(400, 'No hay datos para actualizar');
    }

    fields.push('updated_at = NOW()');
    values.push(id);
    values.push(userId);

    const result = await query(
      `UPDATE addresses SET ${fields.join(', ')} WHERE id = $${idx} AND user_id = $${idx + 1} RETURNING *`,
      values
    );
    if (result.rows.length === 0) {
      throw new AppError(404, 'Dirección no encontrada');
    }
    return result.rows[0];
  }

  async delete(id: string, userId: string) {
    const result = await query(
      'DELETE FROM addresses WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );
    if (result.rows.length === 0) {
      throw new AppError(404, 'Dirección no encontrada');
    }
  }
}
