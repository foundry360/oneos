-- ============================================================================
-- Set User Role to Admin
-- ============================================================================
-- This script updates a user's role to 'admin' in the profiles table
-- Replace 'your-email@example.com' with the actual email address
-- ============================================================================

-- Option 1: Update by email address
UPDATE profiles 
SET role = 'admin',
    updated_at = CURRENT_TIMESTAMP
WHERE email = 'your-email@example.com';

-- Option 2: Update by user ID (if you know the UUID)
-- UPDATE profiles 
-- SET role = 'admin',
--     updated_at = CURRENT_TIMESTAMP
-- WHERE id = 'your-user-uuid-here';

-- Option 3: List all users and their current roles (to find your user)
SELECT 
    u.id,
    u.email,
    COALESCE(p.role, 'user') as current_role,
    p.display_name,
    u.created_at
FROM users u
LEFT JOIN profiles p ON u.id = p.id
ORDER BY u.created_at DESC;

-- Option 4: Create profile if it doesn't exist, then set to admin
-- First, find your user ID:
-- SELECT id, email FROM users WHERE email = 'your-email@example.com';

-- Then create/update profile:
-- INSERT INTO profiles (id, email, role)
-- SELECT id, email, 'admin'
-- FROM users
-- WHERE email = 'your-email@example.com'
-- ON CONFLICT (id) DO UPDATE
-- SET role = 'admin',
--     email = EXCLUDED.email,
--     updated_at = CURRENT_TIMESTAMP;

-- Verify the update
SELECT 
    '✅ Role updated!' as status,
    u.email,
    p.role,
    p.updated_at
FROM users u
JOIN profiles p ON u.id = p.id
WHERE u.email = 'your-email@example.com';

