import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Next.js exposes NEXT_PUBLIC_* variables via process.env
// These are available both server-side and client-side
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      // Supabase not configured - don't auto-login
      setUser(null);
      setLoading(false);
      // Only log in development to avoid console spam
      if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
        const missing = [];
        if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL');
        if (!supabaseAnonKey) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
        
        if (missing.length > 0) {
          console.warn('⚠️ Supabase authentication is not configured.');
          console.warn('Missing environment variables:', missing);
          console.warn('Please check your .env file and docker-compose.yml');
        }
      }
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.access_token) {
        localStorage.setItem('auth-token', session.access_token);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.access_token) {
        localStorage.setItem('auth-token', session.access_token);
      } else {
        localStorage.removeItem('auth-token');
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!supabase) {
      const missing = [];
      if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL');
      if (!supabaseAnonKey) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
      
      throw new Error(
        `Authentication is not configured. Missing: ${missing.join(', ')}. ` +
        `Please create a .env file and restart your Next.js dev server.`
      );
    }
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      // Provide more specific error messages
      if (error.message.includes('Invalid login credentials')) {
        throw new Error('Invalid email or password. Please try again.');
      }
      if (error.message.includes('Email not confirmed')) {
        throw new Error('Please check your email and confirm your account before signing in.');
      }
      throw new Error(error.message || 'Failed to sign in');
    }
    
    if (!data.user || !data.session) {
      throw new Error('Login failed. No user or session returned.');
    }
    
    // Update user state immediately after successful login
    setUser(data.user);
    
    if (data.session.access_token) {
      localStorage.setItem('auth-token', data.session.access_token);
    }
    
    return data;
  };

  const signUp = async (email: string, password: string) => {
    if (!supabase) {
      const devUser = { id: 'dev-user', email };
      setUser(devUser);
      localStorage.setItem('auth-token', 'dev-token');
      return { user: devUser, session: null };
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
    if (data.session?.access_token) {
      localStorage.setItem('auth-token', data.session.access_token);
    }
    return data;
  };

  const signOut = async () => {
    localStorage.removeItem('auth-token');
    if (!supabase) {
      setUser(null);
      return;
    }
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return {
    user,
    loading,
    signIn,
    signUp,
    signOut,
  };
}

