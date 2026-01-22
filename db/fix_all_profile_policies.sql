-- Fix ALL profile policies to prevent infinite recursion
-- This script fixes both read and update policies

-- ============================================================================
-- 1. CREATE HELPER FUNCTION - Get user role (bypasses RLS to avoid recursion)
-- ============================================================================

CREATE OR REPLACE FUNCTION is_user_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    user_role TEXT;
BEGIN
    -- This function runs with SECURITY DEFINER, so it bypasses RLS
    -- This prevents infinite recursion when used in policies
    SELECT role INTO user_role
    FROM profiles
    WHERE id = user_id;
    
    RETURN COALESCE(user_role = 'admin', false);
END;
$$;

-- ============================================================================
-- 2. FIX READ POLICIES - Remove queries that cause recursion
-- ============================================================================

DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Admin can read all profiles" ON profiles;

CREATE POLICY "Users can read own profile"
    ON profiles
    FOR SELECT
    USING (auth.uid() = id);

-- Admin policy using function that bypasses RLS
CREATE POLICY "Admin can read all profiles"
    ON profiles
    FOR SELECT
    USING (is_user_admin(auth.uid()));

-- ============================================================================
-- 3. FIX UPDATE POLICIES - Remove queries that cause recursion
-- ============================================================================

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admin can update all profiles" ON profiles;

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Admin can update all profiles (using function that bypasses RLS)
CREATE POLICY "Admin can update all profiles"
    ON profiles
    FOR UPDATE
    USING (is_user_admin(auth.uid()))
    WITH CHECK (is_user_admin(auth.uid()));

-- ============================================================================
-- 3. FIX TRIGGER - Prevent role changes without querying profiles
-- ============================================================================

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS prevent_role_change_trigger ON profiles;
DROP FUNCTION IF EXISTS prevent_role_change();

-- Create a simpler trigger that doesn't query profiles
CREATE OR REPLACE FUNCTION prevent_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_role TEXT;
BEGIN
    -- Only prevent role change if the role is actually being changed
    IF OLD.role IS DISTINCT FROM NEW.role THEN
        -- Get current user's role from auth.jwt() claim if available
        -- Otherwise, check if they're trying to change their own role
        IF NEW.id = auth.uid() THEN
            -- User is trying to change their own role - prevent it
            -- Only allow if they're an admin (check via JWT claim or allow admin policy to handle)
            -- For now, just prevent all self-role changes
            NEW.role := OLD.role;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER prevent_role_change_trigger
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    WHEN (OLD.role IS DISTINCT FROM NEW.role)
    EXECUTE FUNCTION prevent_role_change();

-- ============================================================================
-- 4. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, UPDATE ON profiles TO authenticated;
GRANT UPDATE (display_name, avatar_url) ON profiles TO authenticated;

-- ============================================================================
-- 5. VERIFY POLICIES
-- ============================================================================

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
WHERE tablename = 'profiles'
ORDER BY policyname;

