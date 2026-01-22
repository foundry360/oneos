-- ============================================================================
-- RBAC Migration for AI Governance Platform
-- ============================================================================
-- This migration implements role-based access control using Supabase Auth
-- and PostgreSQL Row Level Security (RLS)
-- ============================================================================

-- ============================================================================
-- 1. CREATE PROFILES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'governance', 'reviewer', 'user', 'system')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for role-based queries
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
        CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
    END IF;
END $$;

-- ============================================================================
-- 2. UPDATE REVIEW_TASKS TABLE
-- ============================================================================
-- Create table if it doesn't exist, or update existing table
DO $$ 
BEGIN
    -- Create table if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_name = 'review_tasks') THEN
        CREATE TABLE review_tasks (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
            assigned_reviewer UUID REFERENCES auth.users(id) ON DELETE SET NULL,
            status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
            inference_id UUID,
            task_type VARCHAR(50),
            priority VARCHAR(20) DEFAULT 'medium',
            review_notes TEXT,
            approved_at TIMESTAMP,
            approved_by UUID,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    ELSE
        -- Table exists, add/update columns
        -- Add owner_id if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'review_tasks' AND column_name = 'owner_id') THEN
            ALTER TABLE review_tasks ADD COLUMN owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
        END IF;
        
        -- Add assigned_reviewer if it doesn't exist (rename from assigned_to if needed)
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'review_tasks' AND column_name = 'assigned_reviewer') THEN
            IF EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'review_tasks' AND column_name = 'assigned_to') THEN
                ALTER TABLE review_tasks RENAME COLUMN assigned_to TO assigned_reviewer;
            ELSE
                ALTER TABLE review_tasks ADD COLUMN assigned_reviewer UUID REFERENCES auth.users(id) ON DELETE SET NULL;
            END IF;
        END IF;
        
        -- Ensure status column exists with correct constraint
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'review_tasks' AND column_name = 'status') THEN
            -- Update existing status values to match new enum if needed
            UPDATE review_tasks 
            SET status = CASE 
                WHEN status NOT IN ('pending', 'approved', 'rejected') THEN 'pending'
                ELSE status
            END;
        END IF;
    END IF;
END $$;

-- Update status column to match requirements (only if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_name = 'review_tasks') THEN
        -- Update status column type and default
        ALTER TABLE review_tasks 
            ALTER COLUMN status SET DEFAULT 'pending',
            ALTER COLUMN status TYPE TEXT;
        
        -- Drop existing constraint if it exists (to recreate with correct values)
        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'review_tasks_status_check'
        ) THEN
            ALTER TABLE review_tasks DROP CONSTRAINT review_tasks_status_check;
        END IF;
        
        -- Add constraint for status enum
        ALTER TABLE review_tasks 
            ADD CONSTRAINT review_tasks_status_check 
            CHECK (status IN ('pending', 'approved', 'rejected'));
    END IF;
END $$;

-- Indexes for review_tasks
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'review_tasks') THEN
        CREATE INDEX IF NOT EXISTS idx_review_tasks_owner_id ON review_tasks(owner_id);
        CREATE INDEX IF NOT EXISTS idx_review_tasks_assigned_reviewer ON review_tasks(assigned_reviewer);
        CREATE INDEX IF NOT EXISTS idx_review_tasks_status ON review_tasks(status);
    END IF;
END $$;

-- ============================================================================
-- 3. UPDATE AUDIT_LOGS TABLE
-- ============================================================================
-- Create table if it doesn't exist, or update existing table
DO $$
BEGIN
    -- Create table if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_name = 'audit_logs') THEN
        CREATE TABLE audit_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
            action TEXT NOT NULL,
            resource TEXT,
            resource_type VARCHAR(50),
            resource_id UUID,
            details JSONB,
            ip_address INET,
            user_agent TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    ELSE
        -- Table exists, update columns
        -- Rename user_id to actor_id if needed, or add actor_id
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'audit_logs' AND column_name = 'user_id') THEN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                           WHERE table_name = 'audit_logs' AND column_name = 'actor_id') THEN
                ALTER TABLE audit_logs RENAME COLUMN user_id TO actor_id;
            END IF;
        ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'audit_logs' AND column_name = 'actor_id') THEN
            ALTER TABLE audit_logs ADD COLUMN actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
        END IF;
        
        -- Ensure action column exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'audit_logs' AND column_name = 'action') THEN
            ALTER TABLE audit_logs ADD COLUMN action TEXT NOT NULL DEFAULT '';
        END IF;
        
        -- Add resource column (combine resource_type and resource_id into resource text)
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'audit_logs' AND column_name = 'resource') THEN
            ALTER TABLE audit_logs ADD COLUMN resource TEXT;
        END IF;
    END IF;
END $$;

-- Indexes for audit_logs
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
        CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
    END IF;
END $$;

-- ============================================================================
-- 4. ENABLE ROW LEVEL SECURITY
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'review_tasks') THEN
        ALTER TABLE review_tasks ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
        ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- ============================================================================
-- 5. HELPER FUNCTION: Get user role from profile
-- ============================================================================
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS TEXT AS $$
BEGIN
    RETURN (SELECT role FROM profiles WHERE id = user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. HELPER FUNCTION: Check if user has role
-- ============================================================================
CREATE OR REPLACE FUNCTION has_role(user_id UUID, required_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = user_id AND role = required_role
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. HELPER FUNCTION: Check if user is admin or governance
-- ============================================================================
CREATE OR REPLACE FUNCTION is_admin_or_governance(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = user_id AND role IN ('admin', 'governance')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. TRIGGER: Auto-create profile on user signup
-- ============================================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, role)
    VALUES (
        NEW.id,
        NEW.email,
        'user' -- Default role
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- 9. RLS POLICIES: PROFILES TABLE
-- ============================================================================

-- Policy: Users can read their own profile
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile"
    ON profiles
    FOR SELECT
    USING (auth.uid() = id);

-- Policy: Admin can read all profiles
DROP POLICY IF EXISTS "Admin can read all profiles" ON profiles;
CREATE POLICY "Admin can read all profiles"
    ON profiles
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Policy: Admin can update all profiles (including roles)
DROP POLICY IF EXISTS "Admin can update all profiles" ON profiles;
CREATE POLICY "Admin can update all profiles"
    ON profiles
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Policy: Users can update their own profile (except role)
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
    ON profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id AND
        -- Prevent users from changing their own role
        role = (SELECT role FROM profiles WHERE id = auth.uid())
    );

-- ============================================================================
-- 10. RLS POLICIES: REVIEW_TASKS TABLE
-- ============================================================================

-- Policy: Users can insert tasks they own
DROP POLICY IF EXISTS "Users can insert own tasks" ON review_tasks;
CREATE POLICY "Users can insert own tasks"
    ON review_tasks
    FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

-- Policy: Users can read their own tasks
DROP POLICY IF EXISTS "Users can read own tasks" ON review_tasks;
CREATE POLICY "Users can read own tasks"
    ON review_tasks
    FOR SELECT
    USING (auth.uid() = owner_id);

-- Policy: Reviewers can read tasks assigned to them
DROP POLICY IF EXISTS "Reviewers can read assigned tasks" ON review_tasks;
CREATE POLICY "Reviewers can read assigned tasks"
    ON review_tasks
    FOR SELECT
    USING (
        auth.uid() = assigned_reviewer OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('reviewer', 'governance', 'admin')
        )
    );

-- Policy: Reviewers can update tasks assigned to them
DROP POLICY IF EXISTS "Reviewers can update assigned tasks" ON review_tasks;
CREATE POLICY "Reviewers can update assigned tasks"
    ON review_tasks
    FOR UPDATE
    USING (
        auth.uid() = assigned_reviewer OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('reviewer', 'governance', 'admin')
        )
    )
    WITH CHECK (
        auth.uid() = assigned_reviewer OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('reviewer', 'governance', 'admin')
        )
    );

-- Policy: Governance and admin can read all tasks
DROP POLICY IF EXISTS "Governance and admin can read all tasks" ON review_tasks;
CREATE POLICY "Governance and admin can read all tasks"
    ON review_tasks
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('governance', 'admin')
        )
    );

-- ============================================================================
-- 11. RLS POLICIES: AUDIT_LOGS TABLE
-- ============================================================================

-- Policy: Only governance and admin can read audit logs
DROP POLICY IF EXISTS "Governance and admin can read audit logs" ON audit_logs;
CREATE POLICY "Governance and admin can read audit logs"
    ON audit_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('governance', 'admin')
        )
    );

-- Policy: System role (via service key) can insert audit logs
-- Note: This is handled via service role key, not RLS policy
-- RLS is bypassed when using service role key
-- But we add a policy for completeness (will be bypassed by service role)
DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;
CREATE POLICY "System can insert audit logs"
    ON audit_logs
    FOR INSERT
    WITH CHECK (true); -- Service role bypasses RLS anyway

-- ============================================================================
-- 12. FUNCTION: Update updated_at timestamp
-- ============================================================================
-- Create the function if it doesn't exist (used by triggers)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 13. TRIGGER: Update updated_at timestamp for profiles
-- ============================================================================
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON profiles
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 14. GRANT PERMISSIONS
-- ============================================================================
-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON review_tasks TO authenticated;
GRANT SELECT ON audit_logs TO authenticated;

-- Service role has full access (bypasses RLS)
GRANT ALL ON profiles TO service_role;
GRANT ALL ON review_tasks TO service_role;
GRANT ALL ON audit_logs TO service_role;

-- ============================================================================
-- 15. COMMENTS FOR DOCUMENTATION
-- ============================================================================
COMMENT ON TABLE profiles IS 'User profiles with role-based access control';
COMMENT ON COLUMN profiles.role IS 'User role: admin, governance, reviewer, user, or system';
COMMENT ON TABLE review_tasks IS 'Review tasks with owner and assigned reviewer';
COMMENT ON TABLE audit_logs IS 'Audit logs accessible only to governance and admin roles';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Next steps:
-- 1. Run this migration in your Supabase SQL editor
-- 2. Configure JWT claims to include role (see rbac_jwt_setup.sql)
-- 3. Test RLS policies with different user roles
-- ============================================================================

