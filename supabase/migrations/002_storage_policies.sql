-- Storage Policies for Fashion Agent Dashboard
-- This allows your application to access private buckets

-- ============================================
-- PRODUCTS BUCKET POLICIES
-- ============================================

-- Allow authenticated users to upload products
CREATE POLICY "Allow authenticated uploads to products bucket"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'products');

-- Allow authenticated users to read products
CREATE POLICY "Allow authenticated reads from products bucket"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'products');

-- Allow service role full access to products
CREATE POLICY "Allow service role full access to products"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'products');

-- Allow public reads (for displaying images in UI)
CREATE POLICY "Allow public reads from products bucket"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'products');

-- ============================================
-- MODELS BUCKET POLICIES
-- ============================================

-- Allow authenticated users to upload models
CREATE POLICY "Allow authenticated uploads to models bucket"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'models');

-- Allow authenticated users to read models
CREATE POLICY "Allow authenticated reads from models bucket"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'models');

-- Allow service role full access to models
CREATE POLICY "Allow service role full access to models"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'models');

-- Allow public reads
CREATE POLICY "Allow public reads from models bucket"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'models');

-- ============================================
-- GENERATED BUCKET POLICIES
-- ============================================

-- Allow authenticated users to upload generated images
CREATE POLICY "Allow authenticated uploads to generated bucket"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'generated');

-- Allow authenticated users to read generated images
CREATE POLICY "Allow authenticated reads from generated bucket"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'generated');

-- Allow service role full access to generated
CREATE POLICY "Allow service role full access to generated"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'generated');

-- Allow public reads
CREATE POLICY "Allow public reads from generated bucket"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'generated');

-- ============================================
-- BUCKET SETUP (if not already created)
-- ============================================

-- Insert bucket configurations (will be ignored if already exist)
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('products', 'products', false),
  ('models', 'models', false),
  ('generated', 'generated', false)
ON CONFLICT (id) DO NOTHING;
