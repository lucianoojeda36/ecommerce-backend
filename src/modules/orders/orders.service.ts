import { query } from '../../core/database/pool';
import { AppError } from '../../core/middleware/errorHandler';
import { CartService } from '../cart/cart.service';
import { EmailService } from '../email/email.service';
import { logger } from '../../core/logger';

const cartService = new CartService();
const emailService = new EmailService();

export class OrdersService {
  async createFromCart(userId: string, shippingAddress: any, notes?: string, shippingCost: number = 0) {
    logger.info('Creating order from cart', { userId, shippingAddress, notes, shippingCost });
    const cartItems = await cartService.getCart(userId);
    if (cartItems.length === 0) {
      logger.warn('Order creation failed: cart is empty', { userId });
      throw new AppError(400, 'El carrito está vacío');
    }

    const total = await cartService.getCartTotal(userId);
    const totalWithShipping = total + shippingCost;
    const client = await (await import('../../core/database/pool')).pool.connect();

    try {
      await client.query('BEGIN');
      logger.info('Transaction started for order creation', { userId, itemCount: cartItems.length, total });

      const orderResult = await client.query(
        `INSERT INTO orders (user_id, total, shipping_address, notes, shipping_cost)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [userId, totalWithShipping, JSON.stringify(shippingAddress), notes || null, shippingCost]
      );
      const order = orderResult.rows[0];
      logger.info('Order created', { orderId: order.id, userId, total: totalWithShipping, shippingCost });

      for (const item of cartItems) {
        await client.query(
          `INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [order.id, item.product_id, item.name, item.quantity, item.price, item.quantity * item.price]
        );

        await client.query(
          'UPDATE products SET stock = stock - $1 WHERE id = $2',
          [item.quantity, item.product_id]
        );
      }

      await client.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);
      await client.query('COMMIT');
      logger.info('Order created and committed successfully', { orderId: order.id, userId });

      this.sendConfirmationEmail(order.id, userId).catch((err) =>
        logger.error('Error enviando email de confirmación', { orderId: order.id, error: err })
      );

      return order;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Order creation failed and rolled back', { userId, error });
      throw error;
    } finally {
      client.release();
    }
  }

  async findByUser(userId: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const result = await query(
      `SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    const count = await query('SELECT COUNT(*) FROM orders WHERE user_id = $1', [userId]);
    return {
      orders: result.rows,
      total: parseInt(count.rows[0].count),
      page,
      limit,
    };
  }

  async findById(id: string) {
    const order = await query('SELECT * FROM orders WHERE id = $1', [id]);
    if (order.rows.length === 0) {
      throw new AppError(404, 'Orden no encontrada');
    }

    const items = await query(
      `SELECT oi.*, p.images FROM order_items oi
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = $1`,
      [id]
    );

    return { ...order.rows[0], items: items.rows };
  }

  async findAll(page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const result = await query(
      `SELECT o.*, u.name as user_name, u.email as user_email
       FROM orders o JOIN users u ON o.user_id = u.id
       ORDER BY o.created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    const count = await query('SELECT COUNT(*) FROM orders');
    return {
      orders: result.rows,
      total: parseInt(count.rows[0].count),
      page,
      limit,
    };
  }

  async updateStatus(id: string, status: string) {
    const valid = ['pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled'];
    if (!valid.includes(status)) {
      throw new AppError(400, `Estado inválido. Valores: ${valid.join(', ')}`);
    }

    const result = await query(
      `UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, id]
    );
    if (result.rows.length === 0) {
      throw new AppError(404, 'Orden no encontrada');
    }

    if (status === 'confirmed') {
      this.sendConfirmationEmail(id, result.rows[0].user_id).catch((err) =>
        logger.error('Error enviando email de confirmación', { orderId: id, error: err })
      );
    }

    return result.rows[0];
  }

  async getUserOrders(userId: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const result = await query(
      'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [userId, limit, offset]
    );
    const count = await query('SELECT COUNT(*) FROM orders WHERE user_id = $1', [userId]);
    return {
      orders: result.rows,
      total: parseInt(count.rows[0].count),
      page,
      limit,
    };
  }

  private async sendConfirmationEmail(orderId: string, userId: string) {
    const userResult = await query('SELECT name, email FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) return;

    const orderResult = await query('SELECT * FROM orders WHERE id = $1', [orderId]);
    if (orderResult.rows.length === 0) return;

    const itemsResult = await query('SELECT * FROM order_items WHERE order_id = $1', [orderId]);

    const order = orderResult.rows[0];
    await emailService.sendOrderConfirmation(
      {
        orderId: order.id,
        total: order.total,
        items: itemsResult.rows,
        shippingAddress: order.shipping_address,
      },
      userResult.rows[0].email,
      userResult.rows[0].name
    );
  }
}
