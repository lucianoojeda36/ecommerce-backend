import { query } from '../../core/database/pool';
import { AppError } from '../../core/middleware/errorHandler';
import { logger } from '../../core/logger';

export class CartService {
  async getCart(userId: string) {
    logger.info('Fetching cart for user', { userId });
    const result = await query(
      `SELECT ci.id, ci.quantity, ci.product_id, ci.created_at,
              p.name, p.slug, p.price, p.images, p.stock, p.is_active, p.weight_kg
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.user_id = $1
       ORDER BY ci.created_at DESC`,
      [userId]
    );
    logger.info('Cart fetched successfully', { userId, itemCount: result.rows.length });
    return result.rows;
  }

  async addItem(userId: string, productId: string, quantity: number) {
    logger.info('Adding item to cart', { userId, productId, quantity });
    const product = await query(
      'SELECT id, stock, is_active FROM products WHERE id = $1',
      [productId]
    );
    if (product.rows.length === 0) {
      logger.warn('Failed to add item: product not found', { userId, productId });
      throw new AppError(404, 'Producto no encontrado');
    }
    if (!product.rows[0].is_active) {
      logger.warn('Failed to add item: product not active', { userId, productId });
      throw new AppError(400, 'Producto no disponible');
    }
    if (product.rows[0].stock < quantity) {
      logger.warn('Failed to add item: insufficient stock', { userId, productId, quantity, stock: product.rows[0].stock });
      throw new AppError(400, 'Stock insuficiente');
    }

    const existing = await query(
      'SELECT id, quantity FROM cart_items WHERE user_id = $1 AND product_id = $2',
      [userId, productId]
    );

    if (existing.rows.length > 0) {
      const newQty = existing.rows[0].quantity + quantity;
      if (product.rows[0].stock < newQty) {
        logger.warn('Failed to add item: insufficient stock for existing item', { userId, productId, newQty, stock: product.rows[0].stock });
        throw new AppError(400, 'Stock insuficiente');
      }
      const result = await query(
        `UPDATE cart_items SET quantity = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
        [newQty, existing.rows[0].id]
      );
      logger.info('Updated existing cart item', { userId, productId, newQty });
      return result.rows[0];
    }

    const result = await query(
      `INSERT INTO cart_items (user_id, product_id, quantity) VALUES ($1, $2, $3) RETURNING *`,
      [userId, productId, quantity]
    );
    logger.info('Added new item to cart', { userId, productId, quantity, cartItemId: result.rows[0].id });
    return result.rows[0];
  }

  async updateItemQuantity(userId: string, itemId: string, quantity: number) {
    if (quantity < 1) {
      throw new AppError(400, 'La cantidad debe ser al menos 1');
    }

    const item = await query(
      'SELECT ci.product_id, p.stock FROM cart_items ci JOIN products p ON ci.product_id = p.id WHERE ci.id = $1 AND ci.user_id = $2',
      [itemId, userId]
    );
    if (item.rows.length === 0) {
      throw new AppError(404, 'Item no encontrado en el carrito');
    }
    if (item.rows[0].stock < quantity) {
      throw new AppError(400, 'Stock insuficiente');
    }

    const result = await query(
      `UPDATE cart_items SET quantity = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING *`,
      [quantity, itemId, userId]
    );
    return result.rows[0];
  }

  async removeItem(userId: string, itemId: string) {
    const result = await query(
      'DELETE FROM cart_items WHERE id = $1 AND user_id = $2 RETURNING id',
      [itemId, userId]
    );
    if (result.rows.length === 0) {
      throw new AppError(404, 'Item no encontrado en el carrito');
    }
  }

  async clearCart(userId: string) {
    await query('DELETE FROM cart_items WHERE user_id = $1', [userId]);
  }

  async getCartTotal(userId: string): Promise<number> {
    const result = await query(
      `SELECT COALESCE(SUM(ci.quantity * p.price), 0) as total
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.user_id = $1`,
      [userId]
    );
    return parseFloat(result.rows[0].total);
  }
}
