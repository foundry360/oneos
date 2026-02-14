import { useState, useEffect } from 'react';

// Ensure API_URL always has /api suffix
const getApiUrl = () => {
  const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
  return url.endsWith('/api') ? url : `${url}/api`;
};

const API_URL = getApiUrl();

export interface Profile {
  id: string;
  email: string;
  role: string;
  display_name?: string;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
}

export function useProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('auth-token');
        if (!token) {
          setLoading(false);
          return;
        }

        const response = await fetch(`${API_URL}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.user) {
            setProfile({
              id: data.user.id,
              email: data.user.email,
              role: data.user.role || 'user',
              display_name: data.user.display_name,
              avatar_url: data.user.avatar_url,
              created_at: data.user.created_at,
              updated_at: data.user.updated_at,
            });
          }
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  const updateProfile = async (updates: { display_name?: string; avatar_url?: string }) => {
    if (!userId) {
      throw new Error('User not logged in');
    }

    setUpdating(true);
    try {
      const token = localStorage.getItem('auth-token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${API_URL}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update profile');
      }

      const data = await response.json();
      setProfile(prev => prev ? { ...prev, ...data.profile } : data.profile);
      
      return data.profile;
    } catch (error: any) {
      console.error('Error updating profile:', error);
      throw new Error(error?.message || 'Failed to update profile');
    } finally {
      setUpdating(false);
    }
  };

  const uploadAvatar = async (file: File): Promise<string> => {
    if (!userId) {
      throw new Error('User not logged in');
    }

    // For now, create a data URL (base64)
    // TODO: Implement file upload endpoint in backend
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        updateProfile({ avatar_url: dataUrl })
          .then(() => resolve(dataUrl))
          .catch(reject);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  return {
    profile,
    loading,
    updating,
    updateProfile,
    uploadAvatar,
  };
}
