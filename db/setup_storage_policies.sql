-- Setup Storage Bucket Policies for profile-avatars
-- This allows authenticated users to upload and manage their own avatars

-- ============================================================================
-- 1. CREATE STORAGE BUCKET (if it doesn't exist)
-- ============================================================================

-- Note: Buckets are typically created via Supabase Dashboard or API
-- This script assumes the bucket 'profile-avatars' already exists
-- If not, create it first in Supabase Dashboard: Storage > New bucket > profile-avatars

-- ============================================================================
-- 2. ENABLE RLS ON STORAGE OBJECTS (if not already enabled)
-- ============================================================================

-- Note: RLS is usually enabled by default on storage.objects
-- If you need to enable it, do so via Supabase Dashboard:
-- Storage > Settings > Enable RLS
-- Or use the Supabase Management API

-- ============================================================================
-- 3. CREATE STORAGE POLICIES FOR profile-avatars BUCKET
-- ============================================================================

-- Policy: Allow authenticated users to upload their own avatars
-- Files are stored with the user ID as part of the filename
DROP POLICY IF EXISTS "Users can upload own avatars" ON storage.objects;

CREATE POLICY "Users can upload own avatars"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'profile-avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Policy: Allow authenticated users to read all avatars (for displaying)
DROP POLICY IF EXISTS "Users can read avatars" ON storage.objects;

CREATE POLICY "Users can read avatars"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'profile-avatars');

-- Policy: Allow authenticated users to update their own avatars
DROP POLICY IF EXISTS "Users can update own avatars" ON storage.objects;

CREATE POLICY "Users can update own avatars"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'profile-avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
    )
    WITH CHECK (
        bucket_id = 'profile-avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Policy: Allow authenticated users to delete their own avatars
DROP POLICY IF EXISTS "Users can delete own avatars" ON storage.objects;

CREATE POLICY "Users can delete own avatars"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'profile-avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- ============================================================================
-- ALTERNATIVE: Simpler policy that allows uploads to any path in the bucket
-- Use this if the folder-based approach doesn't work
-- ============================================================================

-- Uncomment these if the above policies don't work:

-- DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
-- CREATE POLICY "Authenticated users can upload avatars"
--     ON storage.objects
--     FOR INSERT
--     TO authenticated
--     WITH CHECK (bucket_id = 'profile-avatars');

-- DROP POLICY IF EXISTS "Authenticated users can read avatars" ON storage.objects;
-- CREATE POLICY "Authenticated users can read avatars"
--     ON storage.objects
--     FOR SELECT
--     TO authenticated
--     USING (bucket_id = 'profile-avatars');

-- DROP POLICY IF EXISTS "Authenticated users can update avatars" ON storage.objects;
-- CREATE POLICY "Authenticated users can update avatars"
--     ON storage.objects
--     FOR UPDATE
--     TO authenticated
--     USING (bucket_id = 'profile-avatars')
--     WITH CHECK (bucket_id = 'profile-avatars');

-- DROP POLICY IF EXISTS "Authenticated users can delete avatars" ON storage.objects;
-- CREATE POLICY "Authenticated users can delete avatars"
--     ON storage.objects
--     FOR DELETE
--     TO authenticated
--     USING (bucket_id = 'profile-avatars');

-- ============================================================================
-- 4. VERIFY POLICIES
-- ============================================================================

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage'
ORDER BY policyname;

