# RBAC Implementation Guide

This document provides a complete guide for implementing Role-Based Access Control (RBAC) using Supabase Auth and PostgreSQL Row Level Security (RLS) for the AI Governance Platform.

## Overview

The RBAC system implements five roles:
- **admin**: Full access to all resources (users, audits, configurations)
- **governance**: Can review, approve, and audit AI decisions
- **reviewer**: Can approve or reject AI outputs assigned to them
- **user**: Can submit data and view their own results
- **system**: Internal service role for backend workflows

## Architecture

### Security Model
- **Row Level Security (RLS)**: All database tables have RLS enabled
- **JWT Claims**: User roles are included in JWT tokens
- **Service Role**: Backend uses service role key to bypass RLS when needed
- **Client-Side Enforcement**: All security is enforced at the database level, not client-side

### Database Schema

#### Profiles Table
Stores user profiles with roles:
- `id` (UUID, references auth.users.id)
- `email` (TEXT)
- `role` (TEXT, enum: admin, governance, reviewer, user, system)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

#### Review Tasks Table
Stores review tasks with ownership and assignment:
- `id` (UUID, primary key)
- `owner_id` (UUID, references auth.users.id)
- `assigned_reviewer` (UUID, references auth.users.id)
- `status` (TEXT: pending, approved, rejected)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

#### Audit Logs Table
Stores audit trail:
- `id` (UUID, primary key)
- `actor_id` (UUID, references auth.users.id)
- `action` (TEXT)
- `resource` (TEXT)
- `created_at` (TIMESTAMP)

## Setup Instructions

### Step 1: Run Database Migration

1. Open your Supabase Dashboard
2. Navigate to SQL Editor
3. Run the migration script: `db/rbac_migration.sql`

This will:
- Create the `profiles` table
- Update `review_tasks` and `audit_logs` tables
- Enable RLS on all tables
- Create RLS policies
- Set up automatic profile creation on user signup

### Step 2: Configure JWT Claims

1. In Supabase Dashboard, go to **Authentication > Settings > JWT Settings**
2. Add custom claims in the JWT template:

```json
{
  "role": "{{ (SELECT role FROM profiles WHERE id = user.id) }}",
  "email": "{{ user.email }}"
}
```

Alternatively, you can use the helper function:

```json
{
  "role": "{{ get_user_role_for_jwt(user.id) }}",
  "email": "{{ user.email }}"
}
```

3. Save the configuration

### Step 3: Verify Setup

Test the setup by:

1. **Create a test user** via Supabase Auth
2. **Check profile creation**: The profile should be automatically created with role 'user'
3. **Verify JWT**: Check that the JWT token includes the role claim
4. **Test RLS policies**: Try querying data with different user roles

## RLS Policies

### Profiles Table

| Policy | Description |
|--------|-------------|
| Users can read own profile | `auth.uid() = id` |
| Admin can read all profiles | Admin role check |
| Admin can update all profiles | Admin role check |
| Users can update own profile | `auth.uid() = id` (except role) |

### Review Tasks Table

| Policy | Description |
|--------|-------------|
| Users can insert own tasks | `auth.uid() = owner_id` |
| Users can read own tasks | `auth.uid() = owner_id` |
| Reviewers can read assigned tasks | `auth.uid() = assigned_reviewer` OR reviewer/governance/admin role |
| Reviewers can update assigned tasks | Same as read |
| Governance/Admin can read all tasks | Role check |

### Audit Logs Table

| Policy | Description |
|--------|-------------|
| Governance/Admin can read | Role check |
| System can insert | Service role (bypasses RLS) |

## Usage Examples

### Frontend (React/Next.js)

See `examples/frontend_rbac_examples.ts` for complete examples.

#### Get Current User Role
```typescript
import { getUserRole } from '@/examples/frontend_rbac_examples';

const role = await getUserRole();
console.log('User role:', role);
```

#### Create Review Task
```typescript
import { createReviewTask } from '@/examples/frontend_rbac_examples';

const task = await createReviewTask({
  owner_id: user.id,
  assigned_reviewer: reviewerId,
  status: 'pending'
});
```

#### Check Role Before Rendering
```typescript
import { useUserRole } from '@/examples/frontend_rbac_examples';

function MyComponent() {
  const { role, loading } = useUserRole();
  
  if (loading) return <div>Loading...</div>;
  if (role === 'admin') return <AdminDashboard />;
  if (role === 'reviewer') return <ReviewerDashboard />;
  return <UserDashboard />;
}
```

### Backend (Node.js/Express)

See `examples/backend_rbac_examples.js` for complete examples.

#### Insert Audit Log
```javascript
const { insertAuditLog } = require('./examples/backend_rbac_examples');

await insertAuditLog({
  actor_id: userId,
  action: 'CREATE_REVIEW_TASK',
  resource: '/api/review/tasks',
  details: { taskId: '...' }
});
```

#### Role-Based Middleware
```javascript
const { requireRole } = require('./examples/backend_rbac_examples');

// Admin-only route
app.get('/api/admin/users', 
  authenticate,
  requireRole('admin'),
  async (req, res) => {
    // Handler code
  }
);
```

#### Get User Role
```javascript
const { getUserRole } = require('./examples/backend_rbac_examples');

const role = await getUserRole(userId);
if (role === 'admin') {
  // Admin logic
}
```

## Role Assignment

### Automatic Assignment
- New users are automatically assigned the `user` role on signup
- This is handled by the `handle_new_user()` trigger function

### Manual Assignment (Admin Only)
Only admins can update user roles:

```typescript
// Frontend
import { updateUserRole } from '@/examples/frontend_rbac_examples';

await updateUserRole(userId, 'reviewer');
```

```javascript
// Backend
const { updateUserRole } = require('./examples/backend_rbac_examples');

await updateUserRole(userId, 'reviewer');
```

## Security Best Practices

### 1. Never Trust Client-Side Role Checks
- All role checks must be enforced at the database level via RLS
- Client-side checks are only for UI/UX purposes

### 2. Use Service Role Key Carefully
- Service role key bypasses RLS
- Only use in backend services
- Never expose service role key to frontend

### 3. Audit All Role Changes
- Log all role updates in audit_logs
- Monitor for privilege escalation attempts

### 4. Regular Security Audits
- Review RLS policies regularly
- Test with different user roles
- Verify JWT claims are correct

## Troubleshooting

### Profile Not Created on Signup
- Check that the trigger `on_auth_user_created` exists
- Verify the `handle_new_user()` function is working
- Check Supabase logs for errors

### RLS Policies Not Working
- Ensure RLS is enabled: `ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;`
- Verify policies are created: Check `pg_policies` table
- Test with different user roles

### JWT Role Claim Missing
- Verify JWT template is configured in Supabase Dashboard
- Check that the profile exists for the user
- Verify the SQL function in JWT template is correct

### Service Role Not Working
- Verify `SUPABASE_SERVICE_KEY` environment variable is set
- Check that the service role key is valid
- Ensure the client is initialized with service role key

## Testing

### Test RLS Policies

1. **Create test users** with different roles
2. **Test each policy** by querying data as different users
3. **Verify restrictions** are enforced correctly

Example test queries:

```sql
-- Test as regular user (should only see own profile)
SET ROLE authenticated;
SET request.jwt.claim.sub = 'user-uuid';
SELECT * FROM profiles;

-- Test as admin (should see all profiles)
SET request.jwt.claim.sub = 'admin-uuid';
SELECT * FROM profiles;
```

## Migration from Existing System

If you have existing users without profiles:

1. **Create profiles for existing users**:
```sql
INSERT INTO profiles (id, email, role)
SELECT id, email, 'user'
FROM auth.users
WHERE id NOT IN (SELECT id FROM profiles);
```

2. **Update existing review_tasks**:
```sql
-- Set owner_id if missing
UPDATE review_tasks
SET owner_id = uploaded_by
WHERE owner_id IS NULL AND uploaded_by IS NOT NULL;
```

3. **Migrate audit_logs**:
```sql
-- Rename user_id to actor_id if needed
ALTER TABLE audit_logs RENAME COLUMN user_id TO actor_id;
```

## Additional Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Guide](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Supabase JWT Guide](https://supabase.com/docs/guides/auth/jwts)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Supabase logs
3. Test RLS policies directly in SQL editor
4. Verify JWT claims in token payload







