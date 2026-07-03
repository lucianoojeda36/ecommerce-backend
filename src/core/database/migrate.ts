import fs from 'fs';
import path from 'path';
import { pool } from './pool';
import { logger } from '../logger';

async function migrate() {
  const client = await pool.connect();
  try {
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir).sort();

    for (const file of files) {
      if (!file.endsWith('.sql')) continue;
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      logger.info(`Running migration: ${file}`);
      await client.query(sql);
      logger.info(`Done: ${file}`);
    }

    logger.info('All migrations completed successfully');
  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
