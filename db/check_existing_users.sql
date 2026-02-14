-- ============================================================================
-- Check Existing Users and Profiles
-- ============================================================================
-- Run this to see what users/profiles exist in your database
-- ============================================================================

-- Check if users table exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') 
        THEN '✅ users table exists'
        ELSE '❌ users table does NOT exist'
    END as users_table_status;

-- Check if profiles table exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') 
        THEN '✅ profiles table exists'
        ELSE '❌ profiles table does NOT exist'
    END as profiles_table_status;

-- List all profiles (these are the users you've been logging in as)
SELECT 
    id,
    email,
    role,
    created_at,
    updated_at
FROM profiles
ORDER BY created_at DESC;

-- Check if auth.users exists (Supabase table)
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') 
        THEN '⚠️ auth.users table exists (Supabase)'
        ELSE '✅ No auth.users table (using local Postgres)'
    END as supabase_status;

-- Count users in each table
SELECT 
    (SELECT COUNT(*) FROM profiles) as profiles_count,
    (SELECT COUNT(*) FROM users) as users_count,
    (SELECT COUNT(*) FROM auth.users WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users')) as supabase_users_count;

