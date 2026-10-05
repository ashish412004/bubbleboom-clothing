-- ==============================================================================
-- BUBBLE BOOM: PRODUCT IMAGES STORAGE BUCKET & RLS POLICIES
-- Run this in your Supabase project dashboard -> SQL Editor -> Run
-- (Do NOT run "ALTER TABLE storage.objects" as that table is owned by supabase_storage_admin)
-- ==============================================================================

-- 1. Ensure storage_path column exists on public.product_images
ALTER TABLE public.product_images 
ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- 2. Configure public-read bucket for product-images (10MB limit, allowed image types)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];

-- 3. Storage RLS Policies for product-images bucket
-- Note: RLS is already enabled on storage.objects by Supabase by default.

-- 3a. Public Read Access: Anyone can view product photos
DROP POLICY IF EXISTS "Public Read Product Images" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Read Product Images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- 3b. Admin Only Insert Access: Only verified administrators or service role can upload images
DROP POLICY IF EXISTS "Admin Insert Product Images" ON storage.objects;
DROP POLICY IF EXISTS "Admin Upload Access" ON storage.objects;
CREATE POLICY "Admin Insert Product Images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND (
    auth.role() = 'service_role'
    OR public.is_admin(auth.uid())
    OR auth.jwt() ->> 'email' = (SELECT COALESCE(current_setting('app.admin_email', true), 'hhshukla241099@gmail.com'))
  )
);

-- 3c. Admin Only Update / Replace Access: Only verified administrators can replace images
DROP POLICY IF EXISTS "Admin Update Product Images" ON storage.objects;
CREATE POLICY "Admin Update Product Images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND (
    auth.role() = 'service_role'
    OR public.is_admin(auth.uid())
    OR auth.jwt() ->> 'email' = (SELECT COALESCE(current_setting('app.admin_email', true), 'hhshukla241099@gmail.com'))
  )
);

-- 3d. Admin Only Delete Access: Only verified administrators can delete images
DROP POLICY IF EXISTS "Admin Delete Product Images" ON storage.objects;
DROP POLICY IF EXISTS "Admin Delete Access" ON storage.objects;
CREATE POLICY "Admin Delete Product Images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND (
    auth.role() = 'service_role'
    OR public.is_admin(auth.uid())
    OR auth.jwt() ->> 'email' = (SELECT COALESCE(current_setting('app.admin_email', true), 'hhshukla241099@gmail.com'))
  )
);
