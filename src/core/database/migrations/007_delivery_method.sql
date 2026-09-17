ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_method VARCHAR(20) NOT NULL DEFAULT 'domicilio' CHECK (delivery_method IN ('domicilio', 'sucursal'));
