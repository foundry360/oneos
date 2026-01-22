-- ============================================================================
-- Fix Missing Profiles for Existing Users
-- ============================================================================
-- If you created users directly in Supabase (not through the app),
-- their profiles might not exist. Run this script to create them.
-- ============================================================================

-- Create profiles for all users in auth.users that don't have profiles
INSERT INTO profiles (id, email, role)
SELECT 
    u.id,
    u.email,
    'user' -- Default role
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Show summary
SELECT 
    COUNT(*) as total_users,
    (SELECT COUNT(*) FROM profiles) as total_profiles,
    COUNT(*) - (SELECT COUNT(*) FROM profiles) as missing_profiles
FROM auth.users;

-- List users without profiles (if any remain)
SELECT 
    u.id,
    u.email,
    u.created_at as user_created_at
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE p.id IS NULL;

