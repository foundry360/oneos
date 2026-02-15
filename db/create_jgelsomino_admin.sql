-- ============================================================================
-- Create Admin User: jgelsomino@foundry360.us
-- ============================================================================
-- This script creates an admin user with the specified credentials
-- Email: jgelsomino@foundry360.us
-- Password: admin123
-- ============================================================================

-- Make sure pgcrypto extension is enabled for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Ensure users table exists (create if it doesn't)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    email_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE
);

-- Ensure profiles table exists (create if it doesn't)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'governance', 'reviewer', 'user', 'system')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Fix foreign key constraint if needed
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
    'jgelsomino@foundry360.us',
    crypt('admin123', gen_salt('bf')),
    true
)
ON CONFLICT (email) DO UPDATE
SET password_hash = crypt('admin123', gen_salt('bf')),
    email_verified = true,
    updated_at = CURRENT_TIMESTAMP;

-- Create the admin profile (link to the user)
INSERT INTO profiles (id, email, role)
SELECT id, email, 'admin'
FROM users
WHERE email = 'jgelsomino@foundry360.us'
ON CONFLICT (id) DO UPDATE
SET role = 'admin',
    email = EXCLUDED.email,
    updated_at = CURRENT_TIMESTAMP;

-- Verify the user was created
SELECT 
    '✅ Admin user created successfully!' as status,
    u.id,
    u.email,
    u.email_verified,
    p.role,
    u.created_at
FROM users u
LEFT JOIN profiles p ON u.id = p.id
WHERE u.email = 'jgelsomino@foundry360.us';

