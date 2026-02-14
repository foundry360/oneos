# Supabase Authentication Setup

## ✅ Configuration Complete

Your Supabase credentials have been configured:

- **Project ID**: `lraufigpyabmkwmibntm`
- **Project URL**: `https://lraufigpyabmkwmibntm.supabase.co`
- **Anon Key**: Configured ✅
- **Service Role Key**: Configured ✅

## Environment Variables

The following environment variables have been set in your `.env` file:

```env
SUPABASE_URL=https://lraufigpyabmkwmibntm.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

NEXT_PUBLIC_SUPABASE_URL=https://lraufigpyabmkwmibntm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Next Steps

### 1. Restart Services

After setting up the `.env` file, restart your Docker Compose services:

```bash
# Restart all services
docker-compose restart

# Or restart the entire stack
docker-compose down
docker-compose up -d
```

### 2. Test Authentication

1. Navigate to http://localhost:3000/login
2. Create a new account using the "Sign Up" button
3. Or sign in with an existing account

### 3. Verify Backend Authentication

The backend will now:
- Require authentication for protected endpoints
- Verify JWT tokens from Supabase
- Store user information in request context

## How It Works

### Frontend (`frontend/hooks/useAuth.ts`)
- Uses Supabase client to handle authentication
- Stores access tokens in localStorage
- Automatically sends tokens with API requests

### Backend (`backend/src/middleware/auth.js`)
- Verifies JWT tokens using Supabase service key
- Extracts user information from tokens
- Protects API endpoints with `authenticate` middleware

## Protected Endpoints

All endpoints in the following routes require authentication:
- `/api/files/*` - File management
- `/api/tokenization/*` - Tokenization operations
- `/api/ai/*` - AI inference
- `/api/review/*` - Review tasks
- `/api/dashboard/*` - Dashboard data

## Troubleshooting

### Authentication Not Working

1. **Check environment variables are loaded:**
   ```bash
   docker-compose exec backend printenv | grep SUPABASE
   docker-compose exec frontend printenv | grep SUPABASE
   ```

2. **Check Supabase project is active:**
   - Visit https://supabase.com/dashboard
   - Verify project `lraufigpyabmkwmibntm` is active

3. **Check browser console:**
   - Open browser DevTools
   - Look for authentication errors
   - Verify tokens are being stored in localStorage

### Backend Authentication Errors

- Check backend logs: `docker-compose logs backend`
- Verify service key is correct
- Ensure Supabase project allows API access

## Security Notes

⚠️ **Important:**
- Never commit `.env` file to version control (already in `.gitignore`)
- Service Role Key has admin access - keep it secure
- Anon Key is safe for frontend use
- Use environment variables in production deployments

## Testing

You can test authentication by:

1. **Creating a test user:**
   - Go to login page
   - Click "Sign Up"
   - Enter email and password
   - Verify you're redirected to dashboard

2. **Testing protected endpoints:**
   ```bash
   # Without token (should fail)
   curl http://localhost:3001/api/files
   
   # With token (should work)
   curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3001/api/files
   ```




