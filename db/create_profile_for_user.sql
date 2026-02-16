-- ============================================================================
-- Create Profile for Existing User
-- ============================================================================
-- Run this script to create a profile for your existing Supabase user
-- ============================================================================

-- Option 1: Create profile for a specific user by email
-- Replace 'your-email@example.com' with your actual email
INSERT INTO profiles (id, email, role)
SELECT id, email, 'user'
FROM auth.users
WHERE email = 'your-email@example.com'
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email,
    updated_at = CURRENT_TIMESTAMP;

-- Option 2: Create profiles for ALL users without profiles
-- Uncomment the lines below if you want to create profiles for all users
/*
INSERT INTO profiles (id, email, role)
SELECT 
    u.id,
    u.email,
    'user' -- Default role
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;
*/

-- Option 3: List all users and their profile status
-- Run this first to see which users need profiles
SELECT 
    u.id,
    u.email,
    u.created_at as user_created_at,
    CASE 
        WHEN p.id IS NOT NULL THEN 'Has Profile'
        ELSE 'Missing Profile'
    END as profile_status,
    p.role as current_role
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
ORDER BY u.created_at DESC;

-- ============================================================================
-- After creating profile, you can update the role if needed:
-- ============================================================================
-- Make yourself admin (replace email):
-- UPDATE profiles SET role = 'admin' WHERE email = 'your-email@example.com';
--
-- Make yourself governance:
-- UPDATE profiles SET role = 'governance' WHERE email = 'your-email@example.com';
--
-- Make yourself reviewer:
-- UPDATE profiles SET role = 'reviewer' WHERE email = 'your-email@example.com';
-- ============================================================================








