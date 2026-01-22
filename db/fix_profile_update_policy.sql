-- Fix RLS policy to allow users to update display_name and avatar_url
-- This ensures the "Users can update own profile" policy allows updating these fields

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create a simpler policy that allows users to update their own profile
-- We'll use a trigger to prevent role changes instead of checking in the policy
CREATE POLICY "Users can update own profile"
    ON profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Create a trigger function to prevent users from changing their own role
CREATE OR REPLACE FUNCTION prevent_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- If the role is being changed and the user is not an admin, prevent it
    IF OLD.role IS DISTINCT FROM NEW.role THEN
        -- Check if current user is admin (bypass RLS with SECURITY DEFINER)
        IF NOT EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        ) THEN
            -- Non-admin trying to change role - revert to old role
            NEW.role := OLD.role;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS prevent_role_change_trigger ON profiles;

-- Create the trigger
CREATE TRIGGER prevent_role_change_trigger
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION prevent_role_change();

-- Grant UPDATE permission on display_name and avatar_url columns
-- (This is usually handled by the table-level GRANT, but we'll be explicit)
GRANT UPDATE (display_name, avatar_url) ON profiles TO authenticated;

-- Verify the policy
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'profiles' AND policyname = 'Users can update own profile';

