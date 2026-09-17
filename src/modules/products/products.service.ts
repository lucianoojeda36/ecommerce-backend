import { query } from '../../core/database/pool';
import { AppError } from '../../core/middleware/errorHandler';
import { generateSlug } from '../../core/utils/slug';

export class ProductsService {
  async findAll(options: {
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
    activeOnly?: boolean;
  }) {
    const { page = 1, limit = 20, category, search, activeOnly = true } = options;
    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (activeOnly) {
      conditions.push(`p.is_active = true`);
    }
    if (category) {
      conditions.push(`c.slug = $${idx++}`);
      values.push(category);
    }
    if (search) {
      conditions.push(`(p.name ILIKE $${idx} OR p.description ILIKE $${idx})`);
      values.push(`%${search}%`);
      idx++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query(
      `SELECT COUNT(*) FROM products p LEFT JOIN categories c ON p.category_id = c.id ${where}`,
      values
    );

    const result = await query(
      `SELECT p.*, c.name as category_name, c.slug as category_slug
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       ${where}
       ORDER BY p.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...values, limit, offset]
    );

    return {
      products: result.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      limit,
    };
  }

  async findBySlug(slug: string) {
    const result = await query(
      `SELECT p.*, c.name as category_name, c.slug as category_slug
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.slug = $1`,
      [slug]
    );
    if (result.rows.length === 0) {
      throw new AppError(404, 'Producto no encontrado');
    }
    return result.rows[0];
  }

  async findById(id: string) {
    const result = await query(
      `SELECT p.*, c.name as category_name, c.slug as category_slug
       FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      throw new AppError(404, 'Producto no encontrado');
    }
    return result.rows[0];
  }

  async create(data: {
    name: string;
    description?: string;
    price: number;
    compare_price?: number;
    category_id?: string;
    stock: number;
    images?: string[];
    weight_kg?: number;
  }) {
    const slug = generateSlug(data.name);
    const result = await query(
      `INSERT INTO products (name, slug, description, price, compare_price, category_id, stock, images, weight_kg)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        data.name,
        slug,
        data.description || null,
        data.price,
        data.compare_price || null,
        data.category_id || null,
        data.stock,
        JSON.stringify(data.images || []),
        data.weight_kg ?? 0,
      ]
    );
    return result.rows[0];
  }

  async update(id: string, data: any) {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.name) {
      fields.push(`name = $${idx++}`);
      values.push(data.name);
      fields.push(`slug = $${idx++}`);
      values.push(generateSlug(data.name));
    }
    if (data.description !== undefined) { fields.push(`description = $${idx++}`); values.push(data.description); }
    if (data.price !== undefined) { fields.push(`price = $${idx++}`); values.push(data.price); }
    if (data.compare_price !== undefined) { fields.push(`compare_price = $${idx++}`); values.push(data.compare_price); }
    if (data.category_id !== undefined) { fields.push(`category_id = $${idx++}`); values.push(data.category_id); }
    if (data.stock !== undefined) { fields.push(`stock = $${idx++}`); values.push(data.stock); }
    if (data.images !== undefined) { fields.push(`images = $${idx++}`); values.push(JSON.stringify(data.images)); }
    if (data.is_active !== undefined) { fields.push(`is_active = $${idx++}`); values.push(data.is_active); }
    if (data.weight_kg !== undefined) { fields.push(`weight_kg = $${idx++}`); values.push(data.weight_kg); }

    if (fields.length === 0) {
      throw new AppError(400, 'No hay datos para actualizar');
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await query(
      `UPDATE products SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new AppError(404, 'Producto no encontrado');
    }

    return result.rows[0];
  }

  async delete(id: string) {
    const result = await query('DELETE FROM products WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      throw new AppError(404, 'Producto no encontrado');
    }
  }

  async addImages(id: string, imageUrls: string[]) {
    const product = await this.findById(id);
    const currentImages = product.images || [];
    const updatedImages = [...currentImages, ...imageUrls];
    return this.update(id, { images: updatedImages });
  }

  async removeImage(id: string, imageUrl: string) {
    const product = await this.findById(id);
    const currentImages: string[] = product.images || [];
    const updatedImages = currentImages.filter((img) => img !== imageUrl);
    return this.update(id, { images: updatedImages });
  }
}
