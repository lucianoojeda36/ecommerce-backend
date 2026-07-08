ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS shipping_config JSONB DEFAULT '{"rates":[],"default_rate":0,"free_shipping_threshold":0}'::jsonb;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_cost DECIMAL(10,2) DEFAULT 0;
