# How to Run the RBAC Migration

## Quick Start

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

3. **Copy and Paste the Migration**
   - Open `db/rbac_migration.sql` from your project
   - Copy the entire contents (all 447 lines)
   - Paste into the Supabase SQL Editor

4. **Run the Migration**
   - Click "Run" or press Ctrl+Enter
   - Wait for it to complete (should take a few seconds)

5. **Verify Success**
   - You should see "Success. No rows returned" or similar
   - Check for any error messages

## What This Migration Does

### Creates/Updates Tables:
- ✅ **profiles** - User profiles with roles (admin, governance, reviewer, user, system)
- ✅ **review_tasks** - Adds `owner_id` and `assigned_reviewer` columns
- ✅ **audit_logs** - Updates to use `actor_id`, `action`, and `resource` columns

### Enables Security:
- ✅ **Row Level Security (RLS)** - Enabled on all three tables
- ✅ **RLS Policies** - 11 policies total:
  - 4 policies for profiles
  - 5 policies for review_tasks
  - 2 policies for audit_logs

### Creates Helper Functions:
- ✅ `get_user_role()` - Get user's role
- ✅ `has_role()` - Check if user has specific role
- ✅ `is_admin_or_governance()` - Check for admin/governance roles
- ✅ `update_updated_at_column()` - Auto-update timestamp

### Sets Up Automation:
- ✅ **Auto-profile creation** - Trigger creates profile when user signs up
- ✅ **Auto-timestamp updates** - Trigger updates `updated_at` on profile changes

## After Running Migration

### 1. Verify Tables Exist
Run this in SQL Editor:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'review_tasks', 'audit_logs');
```

### 2. Verify RLS is Enabled
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'review_tasks', 'audit_logs');
```

### 3. Check Policies
```sql
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'review_tasks', 'audit_logs')
ORDER BY tablename, policyname;
```

### 4. Create Profile for Existing User
If you created a user directly in Supabase (not through the app), run:
```sql
-- Replace 'user-email@example.com' with your actual user email
INSERT INTO profiles (id, email, role)
SELECT id, email, 'user'
FROM auth.users
WHERE email = 'user-email@example.com'
ON CONFLICT (id) DO NOTHING;
```

Or use the helper script:
```sql
-- See db/fix_missing_profiles.sql
```

## Troubleshooting

### Error: "relation already exists"
- This is OK! The migration uses `CREATE TABLE IF NOT EXISTS` and `DROP POLICY IF EXISTS`
- It's safe to run multiple times

### Error: "permission denied"
- Make sure you're running as a database admin
- In Supabase, you should have full permissions by default

### Error: "function does not exist"
- Make sure you run the entire migration from top to bottom
- The functions are created before they're used

### Tables Created But No Policies
- Check if RLS is enabled: `SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'profiles';`
- Re-run the RLS enablement section if needed

## Next Steps

After successful migration:

1. **Configure JWT Claims** (see `db/rbac_jwt_setup.sql`)
   - Go to Authentication > Settings > JWT Settings in Supabase Dashboard
   - Add role to JWT template

2. **Test with Your User**
   - Try logging in with your Supabase user
   - Check if profile was created automatically
   - Verify you can read your own profile

3. **Set Up Admin User** (optional)
   ```sql
   -- Make yourself admin (replace with your user email)
   UPDATE profiles 
   SET role = 'admin' 
   WHERE email = 'your-email@example.com';
   ```

## Migration Safety

✅ **Idempotent** - Safe to run multiple times
✅ **Non-destructive** - Won't delete existing data
✅ **Backward compatible** - Works with existing tables
✅ **Tested** - Handles missing tables, columns, and constraints

## Need Help?

- Check `RBAC_IMPLEMENTATION.md` for detailed documentation
- Run `db/rbac_verification.sql` to verify everything is set up correctly
- See `AUTH_SETUP.md` for authentication troubleshooting




