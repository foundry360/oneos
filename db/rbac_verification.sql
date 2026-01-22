-- ============================================================================
-- RBAC Setup Verification Script
-- ============================================================================
-- Run this script after migration to verify RBAC is set up correctly
-- ============================================================================

-- ============================================================================
-- 1. VERIFY TABLES EXIST
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        RAISE EXCEPTION 'profiles table does not exist';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'review_tasks') THEN
        RAISE EXCEPTION 'review_tasks table does not exist';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
        RAISE EXCEPTION 'audit_logs table does not exist';
    END IF;
    
    RAISE NOTICE '✅ All tables exist';
END $$;

-- ============================================================================
-- 2. VERIFY COLUMNS EXIST
-- ============================================================================

-- Profiles table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'id') THEN
        RAISE EXCEPTION 'profiles.id column missing';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'role') THEN
        RAISE EXCEPTION 'profiles.role column missing';
    END IF;
    
    RAISE NOTICE '✅ Profiles table columns verified';
END $$;

-- Review tasks table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'review_tasks' AND column_name = 'owner_id') THEN
        RAISE EXCEPTION 'review_tasks.owner_id column missing';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'review_tasks' AND column_name = 'assigned_reviewer') THEN
        RAISE EXCEPTION 'review_tasks.assigned_reviewer column missing';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'review_tasks' AND column_name = 'status') THEN
        RAISE EXCEPTION 'review_tasks.status column missing';
    END IF;
    
    RAISE NOTICE '✅ Review tasks table columns verified';
END $$;

-- Audit logs table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'audit_logs' AND column_name = 'actor_id') THEN
        RAISE EXCEPTION 'audit_logs.actor_id column missing';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'audit_logs' AND column_name = 'action') THEN
        RAISE EXCEPTION 'audit_logs.action column missing';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'audit_logs' AND column_name = 'resource') THEN
        RAISE EXCEPTION 'audit_logs.resource column missing';
    END IF;
    
    RAISE NOTICE '✅ Audit logs table columns verified';
END $$;

-- ============================================================================
-- 3. VERIFY RLS IS ENABLED
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'profiles' 
        AND rowsecurity = true
    ) THEN
        RAISE EXCEPTION 'RLS not enabled on profiles table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'review_tasks' 
        AND rowsecurity = true
    ) THEN
        RAISE EXCEPTION 'RLS not enabled on review_tasks table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'audit_logs' 
        AND rowsecurity = true
    ) THEN
        RAISE EXCEPTION 'RLS not enabled on audit_logs table';
    END IF;
    
    RAISE NOTICE '✅ RLS enabled on all tables';
END $$;

-- ============================================================================
-- 4. VERIFY POLICIES EXIST
-- ============================================================================

-- Profiles policies
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles';
    
    IF policy_count < 4 THEN
        RAISE EXCEPTION 'Missing policies on profiles table. Expected at least 4, found %', policy_count;
    END IF;
    
    RAISE NOTICE '✅ Profiles policies verified (%)', policy_count;
END $$;

-- Review tasks policies
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'review_tasks';
    
    IF policy_count < 5 THEN
        RAISE EXCEPTION 'Missing policies on review_tasks table. Expected at least 5, found %', policy_count;
    END IF;
    
    RAISE NOTICE '✅ Review tasks policies verified (%)', policy_count;
END $$;

-- Audit logs policies
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'audit_logs';
    
    IF policy_count < 2 THEN
        RAISE EXCEPTION 'Missing policies on audit_logs table. Expected at least 2, found %', policy_count;
    END IF;
    
    RAISE NOTICE '✅ Audit logs policies verified (%)', policy_count;
END $$;

-- ============================================================================
-- 5. VERIFY FUNCTIONS EXIST
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'handle_new_user'
    ) THEN
        RAISE EXCEPTION 'handle_new_user function does not exist';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'get_user_role'
    ) THEN
        RAISE EXCEPTION 'get_user_role function does not exist';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'has_role'
    ) THEN
        RAISE EXCEPTION 'has_role function does not exist';
    END IF;
    
    RAISE NOTICE '✅ Helper functions verified';
END $$;

-- ============================================================================
-- 6. VERIFY TRIGGER EXISTS
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'on_auth_user_created'
    ) THEN
        RAISE EXCEPTION 'on_auth_user_created trigger does not exist';
    END IF;
    
    RAISE NOTICE '✅ Auto-profile creation trigger verified';
END $$;

-- ============================================================================
-- 7. VERIFY ROLE CONSTRAINT
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints
        WHERE constraint_name = 'profiles_role_check'
    ) THEN
        RAISE EXCEPTION 'profiles role check constraint missing';
    END IF;
    
    RAISE NOTICE '✅ Role constraint verified';
END $$;

-- ============================================================================
-- 8. VERIFY STATUS CONSTRAINT
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints
        WHERE constraint_name = 'review_tasks_status_check'
    ) THEN
        RAISE WARNING 'review_tasks status check constraint missing (optional)';
    ELSE
        RAISE NOTICE '✅ Status constraint verified';
    END IF;
END $$;

-- ============================================================================
-- 9. LIST ALL POLICIES (FOR REVIEW)
-- ============================================================================
SELECT 
    tablename,
    policyname,
    cmd as command,
    roles
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN ('profiles', 'review_tasks', 'audit_logs')
ORDER BY tablename, policyname;

-- ============================================================================
-- 10. SUMMARY
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '✅ RBAC VERIFICATION COMPLETE';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'All checks passed! Your RBAC setup is complete.';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Configure JWT claims in Supabase Dashboard (see rbac_jwt_setup.sql)';
    RAISE NOTICE '2. Test with different user roles';
    RAISE NOTICE '3. Review the policies listed above';
    RAISE NOTICE '';
END $$;

