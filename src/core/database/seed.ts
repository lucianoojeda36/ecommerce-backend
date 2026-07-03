import bcrypt from 'bcryptjs';
import { pool } from './pool';
import { generateSlug } from '../utils/slug';
import { logger } from '../logger';

async function seed() {
  const client = await pool.connect();
  try {
    logger.info('Seeding database...');

    // Admin user
    const adminHash = await bcrypt.hash('admin123', 10);
    await client.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ('Admin', 'admin@tienda.com', $1, 'admin')
       ON CONFLICT (email) DO NOTHING`,
      [adminHash]
    );

    // Customer
    const customerHash = await bcrypt.hash('cliente123', 10);
    await client.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ('Cliente Demo', 'cliente@demo.com', $1, 'customer')
       ON CONFLICT (email) DO NOTHING`,
      [customerHash]
    );

    // Categories
    const categories = [
      { name: 'Electrónica', description: 'Productos electrónicos y gadgets' },
      { name: 'Ropa', description: 'Indumentaria y accesorios' },
      { name: 'Hogar', description: 'Artículos para el hogar' },
      { name: 'Deportes', description: 'Equipamiento deportivo' },
    ];

    for (const cat of categories) {
      await client.query(
        `INSERT INTO categories (name, slug, description)
         VALUES ($1, $2, $3) ON CONFLICT (slug) DO NOTHING`,
        [cat.name, generateSlug(cat.name), cat.description]
      );
    }

    // Store settings
        await client.query(
          `INSERT INTO store_settings (store_name, store_description, primary_color, secondary_color)
         VALUES ('Mi Tienda', 'Tu tienda online favorita', '#3B82F6', '#1E40AF')
         ON CONFLICT DO NOTHING`
     );

     logger.info('Seed completed successfully');
   } catch (error) {
     logger.error('Seed failed:', error);
     throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
