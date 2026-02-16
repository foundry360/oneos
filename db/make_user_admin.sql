-- ============================================================================
-- Make User Admin
-- ============================================================================
-- This script sets a user's role to 'admin' in the profiles table
-- 
-- INSTRUCTIONS:
-- 1. Replace 'YOUR_EMAIL@example.com' with your actual email address
-- 2. Run this script in your database
-- 3. Log out and log back in to refresh your session
-- ============================================================================

-- First, let's see all users and their current roles
SELECT 
    u.id,
    u.email,
    COALESCE(p.role, 'user') as current_role,
    p.display_name,
    u.created_at
FROM users u
LEFT JOIN profiles p ON u.id = p.id
ORDER BY u.created_at DESC;

-- Update your user's role to admin (REPLACE THE EMAIL BELOW)
UPDATE profiles 
SET role = 'admin',
    updated_at = CURRENT_TIMESTAMP
WHERE email = 'YOUR_EMAIL@example.com';

-- If the profile doesn't exist, create it with admin role
INSERT INTO profiles (id, email, role)
SELECT id, email, 'admin'
FROM users
WHERE email = 'YOUR_EMAIL@example.com'
ON CONFLICT (id) DO UPDATE
SET role = 'admin',
    email = EXCLUDED.email,
    updated_at = CURRENT_TIMESTAMP;

-- Verify the update
SELECT 
    '✅ User role updated to admin!' as status,
    u.email,
    p.role,
    p.updated_at
FROM users u
JOIN profiles p ON u.id = p.id
WHERE u.email = 'YOUR_EMAIL@example.com';


