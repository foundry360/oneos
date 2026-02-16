-- ============================================================================
-- Update Current User to Admin Role
-- ============================================================================
-- Run this script to set your user's role to 'admin'
-- Replace 'your-email@example.com' with your actual email address
-- ============================================================================

-- Step 1: List all users to find your email
SELECT 
    u.id,
    u.email,
    COALESCE(p.role, 'user') as current_role,
    p.display_name,
    u.created_at
FROM users u
LEFT JOIN profiles p ON u.id = p.id
ORDER BY u.created_at DESC;

-- Step 2: Update your user's role to admin (replace email)
UPDATE profiles 
SET role = 'admin',
    updated_at = CURRENT_TIMESTAMP
WHERE email = 'your-email@example.com';

-- If profile doesn't exist, create it:
INSERT INTO profiles (id, email, role)
SELECT id, email, 'admin'
FROM users
WHERE email = 'your-email@example.com'
ON CONFLICT (id) DO UPDATE
SET role = 'admin',
    email = EXCLUDED.email,
    updated_at = CURRENT_TIMESTAMP;

-- Step 3: Verify the update
SELECT 
    '✅ Role updated to admin!' as status,
    u.email,
    p.role,
    p.updated_at
FROM users u
JOIN profiles p ON u.id = p.id
WHERE u.email = 'your-email@example.com';

