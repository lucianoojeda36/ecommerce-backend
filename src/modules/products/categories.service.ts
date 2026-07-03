import { query } from '../../core/database/pool';
import { AppError } from '../../core/middleware/errorHandler';
import { generateSlug } from '../../core/utils/slug';

export class CategoriesService {
  async findAll() {
    const result = await query(
      'SELECT * FROM categories ORDER BY name ASC'
    );
    return result.rows;
  }

  async findById(id: string) {
    const result = await query('SELECT * FROM categories WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      throw new AppError(404, 'Categoría no encontrada');
    }
    return result.rows[0];
  }

  async create(data: { name: string; description?: string; image_url?: string }) {
    const slug = generateSlug(data.name);
    const result = await query(
      `INSERT INTO categories (name, slug, description, image_url) VALUES ($1, $2, $3, $4) RETURNING *`,
      [data.name, slug, data.description || null, data.image_url || null]
    );
    return result.rows[0];
  }

  async update(id: string, data: { name?: string; description?: string; image_url?: string }) {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.name) {
      fields.push(`name = $${idx++}`);
      values.push(data.name);
      fields.push(`slug = $${idx++}`);
      values.push(generateSlug(data.name));
    }
    if (data.description !== undefined) {
      fields.push(`description = $${idx++}`);
      values.push(data.description);
    }
    if (data.image_url !== undefined) {
      fields.push(`image_url = $${idx++}`);
      values.push(data.image_url);
    }

    if (fields.length === 0) {
      throw new AppError(400, 'No hay datos para actualizar');
    }

    fields.push('updated_at = NOW()');
    values.push(id);

    const result = await query(
      `UPDATE categories SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new AppError(404, 'Categoría no encontrada');
    }
    return result.rows[0];
  }

  async delete(id: string) {
    const result = await query('DELETE FROM categories WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      throw new AppError(404, 'Categoría no encontrada');
    }
  }
}
