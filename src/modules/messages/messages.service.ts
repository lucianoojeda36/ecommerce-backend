import { query } from '../../core/database/pool';
import { AppError } from '../../core/middleware/errorHandler';
import { emitNewMessage, emitToUser, emitMessagesRead } from '../../core/socket';

export class MessagesService {
  async getByOrderId(orderId: string) {
    const result = await query(
      `SELECT m.*, u.name as sender_name
       FROM order_messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.order_id = $1
       ORDER BY m.created_at ASC`,
      [orderId]
    );
    return result.rows;
  }

  async create(orderId: string, senderId: string, senderRole: 'customer' | 'admin', content: string) {
    if (!content.trim()) {
      throw new AppError(400, 'El mensaje no puede estar vacío');
    }

    const orderCheck = await query('SELECT id, user_id FROM orders WHERE id = $1', [orderId]);
    if (orderCheck.rows.length === 0) {
      throw new AppError(404, 'Orden no encontrada');
    }

    const result = await query(
      `INSERT INTO order_messages (order_id, sender_id, sender_role, content)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [orderId, senderId, senderRole, content.trim()]
    );

    const msg = result.rows[0];

    const userResult = await query('SELECT name FROM users WHERE id = $1', [senderId]);

    const fullMessage = {
      ...msg,
      sender_name: userResult.rows[0]?.name || '',
    };

    emitNewMessage(orderId, fullMessage);

    if (senderRole === 'customer') {
      const admins = await query('SELECT id FROM users WHERE role = $1', ['admin']);
      for (const admin of admins.rows) {
        if (admin.id !== senderId) {
          emitToUser(admin.id, 'new_message', fullMessage);
        }
      }
    } else {
      const customer = orderCheck.rows[0];
      if (customer.user_id !== senderId) {
        emitToUser(customer.user_id, 'new_message', fullMessage);
      }
    }

    return fullMessage;
  }

  async markAsRead(orderId: string, userId: string) {
    await query(
      `UPDATE order_messages SET read = true
       WHERE order_id = $1 AND sender_id != $2 AND read = false`,
      [orderId, userId]
    );
    emitMessagesRead(orderId);
  }

  async markAllAsRead(userId: string, userRole: 'customer' | 'admin') {
    if (userRole === 'admin') {
      await query(
        `UPDATE order_messages SET read = true
         WHERE sender_role = 'customer' AND read = false`
      );
    } else {
      await query(
        `UPDATE order_messages SET read = true
         WHERE sender_role = 'admin' AND read = false
         AND order_id IN (SELECT id FROM orders WHERE user_id = $1)`,
        [userId]
      );
    }
  }

  async getUnreadCount(userId: string, userRole: 'customer' | 'admin') {
    if (userRole === 'admin') {
      const result = await query(
        `SELECT COUNT(*) as count FROM order_messages m
         WHERE m.sender_role = 'customer' AND m.read = false`,
      );
      return parseInt(result.rows[0].count);
    } else {
      const result = await query(
        `SELECT COUNT(*) as count FROM order_messages m
         WHERE m.sender_role = 'admin' AND m.read = false
         AND m.order_id IN (SELECT id FROM orders WHERE user_id = $1)`,
        [userId]
      );
      return parseInt(result.rows[0].count);
    }
  }

  async getUnreadByOrder(userId: string, userRole: 'customer' | 'admin') {
    if (userRole === 'admin') {
      const result = await query(
        `SELECT m.order_id, COUNT(*) as count
         FROM order_messages m
         WHERE m.sender_role = 'customer' AND m.read = false
         GROUP BY m.order_id`,
      );
      return result.rows;
    } else {
      const result = await query(
        `SELECT m.order_id, COUNT(*) as count
         FROM order_messages m
         WHERE m.sender_role = 'admin' AND m.read = false
         AND m.order_id IN (SELECT id FROM orders WHERE user_id = $1)
         GROUP BY m.order_id`,
        [userId]
      );
      return result.rows;
    }
  }
}
