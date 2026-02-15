-- ============================================================================
-- Fix Profiles Table Foreign Key
-- ============================================================================
-- Updates profiles table to reference users table instead of auth.users
-- ============================================================================

-- Drop the old foreign key constraint if it exists
DO $$
BEGIN
    ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
EXCEPTION
    WHEN others THEN
        NULL;
END $$;

-- Add new foreign key to users table
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
END $$;

-- Verify the constraint
SELECT 
    constraint_name,
    table_name,
    constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'profiles' 
AND constraint_type = 'FOREIGN KEY';




