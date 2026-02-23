-- Make product fields more flexible for bulk uploads
-- Most fields should be optional, only SKU is truly required

ALTER TABLE products
  ALTER COLUMN name DROP NOT NULL,
  ALTER COLUMN brand DROP NOT NULL,
  ALTER COLUMN category DROP NOT NULL,
  ALTER COLUMN garment_type DROP NOT NULL;

-- Update constraints to allow NULL
ALTER TABLE products
  DROP CONSTRAINT IF EXISTS products_brand_check,
  DROP CONSTRAINT IF EXISTS products_garment_type_check;

-- Re-add constraints that allow NULL
ALTER TABLE products
  ADD CONSTRAINT products_brand_check
    CHECK (brand IS NULL OR brand IN ('TH8TA', 'ALMOST_ZERO_MOTION', 'OTHER'));

ALTER TABLE products
  ADD CONSTRAINT products_garment_type_check
    CHECK (garment_type IS NULL OR garment_type IN ('upper', 'lower', 'full', 'accessory'));

-- Add some helpful defaults
ALTER TABLE products
  ALTER COLUMN name SET DEFAULT 'Untitled Product',
  ALTER COLUMN brand SET DEFAULT 'TH8TA',
  ALTER COLUMN category SET DEFAULT 'apparel',
  ALTER COLUMN garment_type SET DEFAULT 'upper';
