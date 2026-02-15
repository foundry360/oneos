-- ============================================================================
-- Verify Authentication Setup
-- ============================================================================
-- Run this to check if everything is set up correctly
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

-- Check if verify_password function exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'public' AND p.proname = 'verify_password'
        )
        THEN '✅ verify_password function exists'
        ELSE '❌ verify_password function does NOT exist'
    END as function_status;

-- Count users
SELECT 
    (SELECT COUNT(*) FROM users) as users_count,
    (SELECT COUNT(*) FROM profiles) as profiles_count;

-- List all users
SELECT 
    u.id,
    u.email,
    u.email_verified,
    p.role,
    u.created_at
FROM users u
LEFT JOIN profiles p ON u.id = p.id
ORDER BY u.created_at DESC;




