import { query } from '../../core/database/pool';
import { logger } from '../../core/logger';

export class AdminService {
  async getSettings() {
    logger.info('Getting store settings');
    const result = await query('SELECT * FROM store_settings LIMIT 1');
    if (result.rows.length === 0) {
      logger.info('No settings found, creating default');
      const created = await query(
        `INSERT INTO store_settings (store_name) VALUES ('Mi Tienda') RETURNING *`
      );
      logger.info('Default settings created', { settingsId: created.rows[0].id });
      return created.rows[0];
    }
    logger.info('Settings retrieved', { settingsId: result.rows[0].id });
    return result.rows[0];
  }

  async updateSettings(data: Record<string, any>) {
    const current = await this.getSettings();
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    const allowedFields = [
      'store_name', 'store_logo', 'store_favicon', 'store_description',
      'primary_color', 'secondary_color', 'about_us', 'contact_email',
      'contact_phone', 'address', 'social_links', 'seo_title',
      'seo_description', 'currency', 'font_family', 'theme',
      'shipping_config', 'shipping_origin_postal_code',
      'shipping_package_dimensions', 'shipping_default_weight_kg',
    ];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        fields.push(`${field} = $${idx++}`);
        values.push(typeof data[field] === 'object' ? JSON.stringify(data[field]) : data[field]);
      }
    }

    if (fields.length === 0) return current;

    fields.push('updated_at = NOW()');
    values.push(current.id);

    const result = await query(
      `UPDATE store_settings SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    return result.rows[0];
  }

  async getDashboardStats() {
    const totalOrders = await query('SELECT COUNT(*) FROM orders');
    const totalRevenue = await query('SELECT COALESCE(SUM(total), 0) FROM orders WHERE status != \'cancelled\'');
    const totalUsers = await query('SELECT COUNT(*) FROM users');
    const totalProducts = await query('SELECT COUNT(*) FROM products WHERE is_active = true');
    const pendingOrders = await query('SELECT COUNT(*) FROM orders WHERE status = \'pending\'');
    const recentOrders = await query(
      `SELECT o.id, o.total, o.status, o.created_at, u.name as user_name
       FROM orders o JOIN users u ON o.user_id = u.id
       ORDER BY o.created_at DESC LIMIT 5`
    );
    logger.info('Dashboard stats calculated', {
      totalUsers: parseInt(totalUsers.rows[0].count),
      totalRevenue: parseFloat(totalRevenue.rows[0].coalesce),
      totalProducts: parseInt(totalProducts.rows[0].count),
      pendingOrders: parseInt(pendingOrders.rows[0].count),
      recentOrdersCount: recentOrders.rows.length,
    });

    return {
      stats: {
        totalOrders: parseInt(totalOrders.rows[0].count),
        totalRevenue: parseFloat(totalRevenue.rows[0].coalesce),
        totalUsers: parseInt(totalUsers.rows[0].count),
        totalProducts: parseInt(totalProducts.rows[0].count),
        pendingOrders: parseInt(pendingOrders.rows[0].count),
      },
      recentOrders: recentOrders.rows,
    };
  }
}
