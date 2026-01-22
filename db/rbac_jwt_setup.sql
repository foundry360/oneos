-- ============================================================================
-- JWT Role Claim Setup for Supabase
-- ============================================================================
-- This script configures Supabase to include the user's role in JWT tokens
-- ============================================================================

-- ============================================================================
-- FUNCTION: Get user role for JWT claims
-- ============================================================================
-- This function is called by Supabase to populate custom JWT claims
-- It retrieves the user's role from the profiles table

CREATE OR REPLACE FUNCTION get_user_role_for_jwt(user_id UUID)
RETURNS TEXT AS $$
BEGIN
    RETURN (
        SELECT role 
        FROM profiles 
        WHERE id = user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SUPABASE JWT CONFIGURATION
-- ============================================================================
-- In Supabase Dashboard:
-- 1. Go to Authentication > Settings > JWT Settings
-- 2. Add custom claims in the JWT template:
--
-- {
--   "role": "{{ get_user_role_for_jwt(user.id) }}",
--   "email": "{{ user.email }}"
-- }
--
-- OR use the SQL function directly in the JWT template:
--
-- {
--   "role": "{{ (SELECT role FROM profiles WHERE id = user.id) }}",
--   "email": "{{ user.email }}"
-- }
--
-- ============================================================================

-- ============================================================================
-- ALTERNATIVE: Use Supabase Edge Function for JWT Claims
-- ============================================================================
-- If you prefer to use Edge Functions, you can create a function that
-- modifies the JWT token to include the role claim.
--
-- However, the recommended approach is to use the JWT template in Supabase
-- Dashboard as shown above.
-- ============================================================================

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Test the function (replace with actual user ID):
-- SELECT get_user_role_for_jwt('00000000-0000-0000-0000-000000000000'::UUID);
-- ============================================================================

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. The JWT template in Supabase Dashboard allows you to customize claims
-- 2. The role will be included in every JWT token issued by Supabase
-- 3. Frontend can access role via: session.user.user_metadata.role
--    or from the JWT token directly
-- 4. Backend can verify role from JWT claims when using service role key
-- ============================================================================

