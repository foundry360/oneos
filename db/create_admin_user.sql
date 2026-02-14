-- ============================================================================
-- Create Admin User (Complete Setup)
-- ============================================================================
-- This script creates the profiles table if needed, then creates the admin user
-- Email: admin@example.com
-- Password: admin123
-- ============================================================================

-- Make sure pgcrypto extension is enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'governance', 'reviewer', 'user', 'system')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for profiles
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Fix foreign key to reference users table
DO $$
BEGIN
    ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
EXCEPTION
    WHEN others THEN
        NULL;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'profiles_id_fkey' 
        AND table_name = 'profiles'
    ) THEN
        ALTER TABLE profiles 
        ADD CONSTRAINT profiles_id_fkey 
        FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
EXCEPTION
    WHEN others THEN
        NULL;
END $$;

-- Create the admin user
INSERT INTO users (email, password_hash, email_verified)
VALUES (
    'admin@example.com',
    crypt('admin123', gen_salt('bf')),
    true
)
ON CONFLICT (email) DO NOTHING;

-- Create the admin profile (link to the user)
INSERT INTO profiles (id, email, role)
SELECT id, email, 'admin'
FROM users
WHERE email = 'admin@example.com'
ON CONFLICT (id) DO UPDATE
SET role = 'admin',
    email = EXCLUDED.email,
    updated_at = CURRENT_TIMESTAMP;

-- Verify the user was created
SELECT 
    '✅ Admin user created!' as status,
    u.id,
    u.email,
    u.email_verified,
    p.role,
    u.created_at
FROM users u
LEFT JOIN profiles p ON u.id = p.id
WHERE u.email = 'admin@example.com';
