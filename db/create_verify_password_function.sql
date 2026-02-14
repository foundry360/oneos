-- ============================================================================
-- Create verify_password Function
-- ============================================================================
-- This function is required for login authentication
-- ============================================================================

-- Enable pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create or replace the verify_password function
CREATE OR REPLACE FUNCTION verify_password(
    p_user_email TEXT,
    p_user_password TEXT
)
RETURNS TABLE(
    user_id UUID,
    user_email TEXT,
    role TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.email,
        COALESCE(p.role, 'user') as role
    FROM users u
    LEFT JOIN profiles p ON u.id = p.id
    WHERE u.email = p_user_email
    AND u.password_hash = crypt(p_user_password, u.password_hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify the function was created
SELECT 
    '✅ verify_password function created!' as status,
    proname as function_name,
    pg_get_function_arguments(oid) as arguments
FROM pg_proc
WHERE proname = 'verify_password';

