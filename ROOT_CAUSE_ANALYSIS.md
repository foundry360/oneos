# Root Cause Analysis: Profile Save 401 Error

## Problem
When trying to save/update a governance profile, the frontend receives:
- `401 Unauthorized` error
- `ERR_CONNECTION_REFUSED` (when backend wasn't running)

## Root Cause Identified

### Issue #1: User Object Property Mismatch
**Location:** `backend/src/middleware/auth.js:21`

**Problem:**
When Supabase is not configured (development mode), the `verifyToken` function returned:
```javascript
{ userId: 'dev-user', email: 'dev@example.com' }
```

But the entire codebase expects:
```javascript
req.user.id  // NOT req.user.userId
```

**Impact:**
- `req.user.id` was `undefined`
- RBAC middleware at line 60 checks `if (!req.user || !req.user.id)` → returns 401
- All route handlers using `req.user.id` would fail

### Issue #2: Missing Role in Dev User
The dev user object didn't include role information, causing RBAC checks to fail even if the user object was correct.

### Issue #3: Port Conflict
Multiple backend instances were trying to start, causing `EADDRINUSE` errors.

## Fixes Applied

### Fix #1: Corrected User Object Structure
**File:** `backend/src/middleware/auth.js`

Changed from:
```javascript
return { userId: 'dev-user', email: 'dev@example.com' };
```

To:
```javascript
return { id: 'dev-user', email: 'dev@example.com', user_metadata: { role: 'admin' } };
```

### Fix #2: Early Bypass in Authenticate Middleware
**File:** `backend/src/middleware/auth.js`

Added early bypass when Supabase is not configured:
```javascript
// If Supabase is not configured and we're in development, bypass auth
if (!supabase && process.env.NODE_ENV === 'development') {
  logger.warn('Auth bypassed - Supabase not configured, using dev user');
  req.user = { id: 'dev-user', email: 'dev@example.com', user_metadata: { role: 'admin' } };
  return next();
}
```

This ensures:
- No token validation is attempted when Supabase isn't configured
- Dev user is set directly with correct structure
- RBAC middleware will find the role in `user_metadata.role`

### Fix #3: Process Cleanup
Killed stale Node.js processes blocking port 3001.

## Verification

After these fixes:
1. ✅ `req.user.id` will be `'dev-user'` (not undefined)
2. ✅ `req.user.user_metadata.role` will be `'admin'`
3. ✅ RBAC middleware will grant admin access in dev mode
4. ✅ Profile update route will receive valid `req.user.id`

## Testing

To verify the fix works:
1. Start backend: `cd backend && npm run dev`
2. Try to save a profile in the frontend
3. Check backend logs - should see:
   - `Auth bypassed - Supabase not configured, using dev user`
   - `RBAC bypassed - Supabase not configured, allowing access in development`
   - No 401 errors

## Files Modified
- `backend/src/middleware/auth.js` - Fixed user object structure and added early bypass

