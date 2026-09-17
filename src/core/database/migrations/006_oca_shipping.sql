ALTER TABLE products ADD COLUMN IF NOT EXISTS weight_kg DECIMAL(6,3) NOT NULL DEFAULT 0;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS shipping_origin_postal_code VARCHAR(10);
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS shipping_package_dimensions JSONB DEFAULT '{"largo":30,"ancho":20,"alto":15}'::jsonb;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS shipping_default_weight_kg DECIMAL(6,3) NOT NULL DEFAULT 0.5;
