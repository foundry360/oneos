# Authentication Setup Guide

## Quick Fix: "Auth is not configured" Error

If you're seeing the error "Auth is not configured", you need to create a `.env` file with your Supabase credentials.

### Option 1: Use the Setup Script (Windows)

Run the PowerShell script:

```powershell
.\setup-env.ps1
```

This will create a `.env` file with the Supabase credentials already configured.

### Option 2: Create .env File Manually

Create a `.env` file in the project root (`c:\OneOS\.env`) with the following content:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://lraufigpyabmkwmibntm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxyYXVmaWdweWFibWt3bWlibnRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMTI2MTIsImV4cCI6MjA4NDU4ODYxMn0.BH2Yg-27zCmdpJvdvb7TM-bKieETdka6B6mJ0SG2NGM

# Backend Supabase Configuration
SUPABASE_URL=https://lraufigpyabmkwmibntm.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxyYXVmaWdweWFibWt3bWlibnRtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTAxMjYxMiwiZXhwIjoyMDg0NTg4NjEyfQ.orfNncN4lPyRRiIAsONgwkuIU1z59zw_FOa2UsD2_QU

# Other Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001
NODE_ENV=development
```

### Option 3: Get Your Own Supabase Credentials

If you're using a different Supabase project:

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** > **API**
4. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_KEY`

## After Creating .env File

### 1. Restart Next.js Dev Server

**Important**: Next.js only reads environment variables at startup. After creating or modifying `.env`, you must restart:

```bash
# Stop the current dev server (Ctrl+C)
# Then restart:
cd frontend
npm run dev
```

Or if using Docker:

```bash
docker-compose restart frontend
```

### 2. Verify Configuration

After restarting, check the browser console. You should see:
- ✅ No "Auth is not configured" warnings
- ✅ Supabase Config Check showing `hasUrl: true` and `hasKey: true`

### 3. Test Login

1. Navigate to http://localhost:3000/login
2. Enter your Supabase user credentials
3. Click "Sign In"

## Troubleshooting

### Still seeing "Auth is not configured"?

1. **Check .env file location**: Must be in project root (`c:\OneOS\.env`), not in `frontend/` folder
2. **Check variable names**: Must start with `NEXT_PUBLIC_` for frontend variables
3. **Restart dev server**: Environment variables are only loaded at startup
4. **Check for typos**: No spaces around `=` sign in `.env` file
5. **Check file encoding**: Should be UTF-8, no BOM

### User exists in Supabase but can't login?

1. **Check user email confirmation**: Some Supabase setups require email confirmation
2. **Check password**: Make sure you're using the correct password
3. **Check Supabase Auth settings**: Go to Authentication > Settings in Supabase Dashboard
4. **Check browser console**: Look for specific error messages

### Profile not created automatically?

If you created a user directly in Supabase (not through the app), the profile might not exist. Run this SQL in Supabase SQL Editor:

```sql
-- Create profile for existing user (replace with actual user ID and email)
INSERT INTO profiles (id, email, role)
SELECT id, email, 'user'
FROM auth.users
WHERE id NOT IN (SELECT id FROM profiles)
ON CONFLICT (id) DO NOTHING;
```

## Verification Checklist

- [ ] `.env` file exists in project root
- [ ] `NEXT_PUBLIC_SUPABASE_URL` is set
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set
- [ ] Next.js dev server has been restarted
- [ ] Browser console shows no auth errors
- [ ] Can see login page without "Auth not configured" warning
- [ ] Can successfully log in with Supabase user

## Need Help?

1. Check browser console for detailed error messages
2. Check Next.js terminal output for errors
3. Verify Supabase project is active and accessible
4. Test Supabase connection directly in Supabase Dashboard




