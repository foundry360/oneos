import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Get a valid auth token, refreshing if necessary
 * @returns The access token or null if not authenticated
 */
export async function getValidAuthToken(): Promise<string | null> {
  if (!supabase) {
    // In development, return dev token if Supabase not configured
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth-token');
    }
    return null;
  }

  try {
    // Get current session
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error getting session:', error);
      return null;
    }

    if (!session) {
      // No session, remove token
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth-token');
      }
      return null;
    }

    // Check if token is expired (with 5 minute buffer)
    const expiresAt = session.expires_at;
    const now = Math.floor(Date.now() / 1000);
    const buffer = 5 * 60; // 5 minutes

    if (expiresAt && (expiresAt - now) < buffer) {
      // Token is expired or about to expire, try to refresh
      console.log('Token expired or about to expire, refreshing...');
      const { data: { session: newSession }, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError || !newSession) {
        console.error('Error refreshing session:', refreshError);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth-token');
        }
        return null;
      }

      // Update token in localStorage
      if (typeof window !== 'undefined' && newSession.access_token) {
        localStorage.setItem('auth-token', newSession.access_token);
      }

      return newSession.access_token;
    }

    // Token is still valid, update localStorage if needed
    if (typeof window !== 'undefined' && session.access_token) {
      const storedToken = localStorage.getItem('auth-token');
      if (storedToken !== session.access_token) {
        localStorage.setItem('auth-token', session.access_token);
      }
    }

    return session.access_token;
  } catch (error) {
    console.error('Error in getValidAuthToken:', error);
    return null;
  }
}

/**
 * Handle 401 errors by attempting to refresh the token
 * @param error The axios error
 * @returns true if token was refreshed and request should be retried
 */
export async function handleAuthError(error: any): Promise<boolean> {
  if (error?.response?.status === 401) {
    console.log('Received 401 error, attempting to refresh token...');
    
    if (!supabase) {
      return false;
    }

    try {
      const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError || !session) {
        console.error('Failed to refresh session:', refreshError);
        // Redirect to login or clear auth
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth-token');
          // Optionally redirect to login page
          // window.location.href = '/login';
        }
        return false;
      }

      // Update token in localStorage
      if (typeof window !== 'undefined' && session.access_token) {
        localStorage.setItem('auth-token', session.access_token);
        console.log('Token refreshed successfully');
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error refreshing token:', error);
      return false;
    }
  }

  return false;
}

