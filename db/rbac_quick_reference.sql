-- ============================================================================
-- RBAC Quick Reference - Common Operations
-- ============================================================================
-- This file contains quick reference queries for common RBAC operations
-- ============================================================================

-- ============================================================================
-- 1. CHECK CURRENT USER ROLE
-- ============================================================================
SELECT role FROM profiles WHERE id = auth.uid();

-- ============================================================================
-- 2. LIST ALL USERS BY ROLE
-- ============================================================================
SELECT id, email, role, created_at 
FROM profiles 
WHERE role = 'reviewer'
ORDER BY created_at DESC;

-- ============================================================================
-- 3. UPDATE USER ROLE (Admin Only - via service role)
-- ============================================================================
-- Note: This requires service role key or admin permissions
UPDATE profiles 
SET role = 'reviewer', updated_at = NOW()
WHERE id = 'user-uuid-here';

-- ============================================================================
-- 4. CREATE PROFILE FOR EXISTING USER
-- ============================================================================
INSERT INTO profiles (id, email, role)
VALUES ('user-uuid', 'user@example.com', 'user')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 5. GET ALL REVIEW TASKS FOR CURRENT USER
-- ============================================================================
SELECT * FROM review_tasks 
WHERE owner_id = auth.uid()
ORDER BY created_at DESC;

-- ============================================================================
-- 6. GET ASSIGNED REVIEW TASKS FOR CURRENT USER
-- ============================================================================
SELECT * FROM review_tasks 
WHERE assigned_reviewer = auth.uid()
ORDER BY created_at DESC;

-- ============================================================================
-- 7. GET ALL REVIEW TASKS (Governance/Admin Only)
-- ============================================================================
-- This query will only work if user has governance or admin role
SELECT * FROM review_tasks 
ORDER BY created_at DESC;

-- ============================================================================
-- 8. GET AUDIT LOGS (Governance/Admin Only)
-- ============================================================================
SELECT * FROM audit_logs 
ORDER BY created_at DESC 
LIMIT 100;

-- ============================================================================
-- 9. CHECK RLS POLICIES STATUS
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
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================================================
-- 10. VERIFY RLS IS ENABLED
-- ============================================================================
SELECT 
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('profiles', 'review_tasks', 'audit_logs');

-- ============================================================================
-- 11. GET USER PROFILE WITH ROLE
-- ============================================================================
SELECT p.*, u.email as auth_email
FROM profiles p
JOIN auth.users u ON p.id = u.id
WHERE p.id = auth.uid();

-- ============================================================================
-- 12. COUNT USERS BY ROLE
-- ============================================================================
SELECT role, COUNT(*) as count
FROM profiles
GROUP BY role
ORDER BY count DESC;

-- ============================================================================
-- 13. FIND USERS WITHOUT PROFILES
-- ============================================================================
SELECT u.id, u.email
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- ============================================================================
-- 14. GET RECENT AUDIT LOGS FOR SPECIFIC USER
-- ============================================================================
SELECT * FROM audit_logs
WHERE actor_id = 'user-uuid-here'
ORDER BY created_at DESC
LIMIT 50;

-- ============================================================================
-- 15. GET PENDING REVIEW TASKS
-- ============================================================================
SELECT * FROM review_tasks
WHERE status = 'pending'
ORDER BY created_at ASC;

-- ============================================================================
-- 16. GET REVIEW TASKS BY STATUS
-- ============================================================================
SELECT status, COUNT(*) as count
FROM review_tasks
GROUP BY status;

-- ============================================================================
-- 17. UPDATE REVIEW TASK STATUS
-- ============================================================================
-- Note: RLS will enforce that only assigned reviewer or admin can update
UPDATE review_tasks
SET status = 'approved',
    updated_at = NOW()
WHERE id = 'task-uuid-here'
    AND assigned_reviewer = auth.uid();

-- ============================================================================
-- 18. DISABLE RLS (FOR TESTING ONLY - NOT RECOMMENDED IN PRODUCTION)
-- ============================================================================
-- ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE review_tasks DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 19. ENABLE RLS (ALWAYS ENABLE AFTER TESTING)
-- ============================================================================
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE review_tasks ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 20. DROP ALL POLICIES (FOR RESET - USE WITH CAUTION)
-- ============================================================================
-- DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
-- DROP POLICY IF EXISTS "Admin can read all profiles" ON profiles;
-- DROP POLICY IF EXISTS "Admin can update all profiles" ON profiles;
-- DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
-- DROP POLICY IF EXISTS "Users can insert own tasks" ON review_tasks;
-- DROP POLICY IF EXISTS "Users can read own tasks" ON review_tasks;
-- DROP POLICY IF EXISTS "Reviewers can read assigned tasks" ON review_tasks;
-- DROP POLICY IF EXISTS "Reviewers can update assigned tasks" ON review_tasks;
-- DROP POLICY IF EXISTS "Governance and admin can read all tasks" ON review_tasks;
-- DROP POLICY IF EXISTS "Governance and admin can read audit logs" ON audit_logs;
-- DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;

-- ============================================================================
-- END OF QUICK REFERENCE
-- ============================================================================

