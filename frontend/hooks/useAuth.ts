import { useState, useEffect } from 'react';

// Ensure API_URL always has /api suffix
const getApiUrl = () => {
  const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
  // Ensure it ends with /api
  return url.endsWith('/api') ? url : `${url}/api`;
};

const API_URL = getApiUrl();

interface User {
  id: string;
  email: string;
  role?: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing token on mount
    const token = localStorage.getItem('auth-token');
    if (token) {
      // Verify token is still valid by fetching current user
      fetch(`${API_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
        .then(res => {
          if (res.ok) {
            return res.json();
          }
          // Token invalid, remove it
          localStorage.removeItem('auth-token');
          return null;
        })
        .then(data => {
          if (data?.user) {
            setUser(data.user);
          } else {
            setUser(null);
          }
          setLoading(false);
        })
        .catch(() => {
          localStorage.removeItem('auth-token');
          setUser(null);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to sign in');
      }

      const data = await response.json();
      
      if (data.token) {
        localStorage.setItem('auth-token', data.token);
      }
      
      setUser(data.user);
      
      return { user: data.user, session: { access_token: data.token } };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to sign in');
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to register');
      }

      const data = await response.json();
      
      if (data.token) {
        localStorage.setItem('auth-token', data.token);
      }
      
      setUser(data.user);
      
      return { user: data.user, session: { access_token: data.token } };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to register');
    }
  };

  const signOut = async () => {
    localStorage.removeItem('auth-token');
    setUser(null);
  };

  return {
    user,
    loading,
    signIn,
    signUp,
    signOut,
  };
}
