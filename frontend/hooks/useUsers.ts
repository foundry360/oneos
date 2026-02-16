import { useState, useEffect } from 'react';
import axios from 'axios';

// Get base API URL (without /api suffix)
const getApiUrl = () => {
  const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  // Remove trailing /api if present (we add it manually in the requests)
  return url.endsWith('/api') ? url.slice(0, -4) : url;
};

const API_URL = getApiUrl();

interface User {
  id: string;
  email: string;
  role: 'admin' | 'governance' | 'reviewer' | 'user' | 'system';
  display_name?: string;
  avatar_url?: string;
  email_verified: boolean;
  user_created_at: string;
  last_login?: string;
  profile_created_at: string;
  updated_at: string;
}

interface CreateUserData {
  email: string;
  password: string;
  role?: 'admin' | 'governance' | 'reviewer' | 'user';
  displayName?: string;
}

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth-token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchUsers = async (filters?: { role?: string; search?: string }) => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (filters?.role) params.append('role', filters.role);
      if (filters?.search) params.append('search', filters.search);
      
      const response = await axios.get(`${API_URL}/api/users?${params.toString()}`, {
        headers: getAuthHeaders()
      });
      setUsers(response.data.users);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to fetch users';
      console.error('Error fetching users:', {
        status: err.response?.status,
        statusText: err.response?.statusText,
        error: errorMessage,
        data: err.response?.data
      });
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const createUser = async (data: CreateUserData) => {
    try {
      const response = await axios.post(`${API_URL}/api/users`, {
        email: data.email,
        password: data.password,
        role: data.role || 'user',
        displayName: data.displayName
      }, {
        headers: getAuthHeaders()
      });
      await fetchUsers();
      return response.data.user;
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'Failed to create user');
    }
  };

  const updateUser = async (userId: string, updates: { role?: string; displayName?: string }) => {
    try {
      const response = await axios.put(`${API_URL}/api/users/${userId}`, updates, {
        headers: getAuthHeaders()
      });
      await fetchUsers();
      return response.data.user;
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'Failed to update user');
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      await axios.delete(`${API_URL}/api/users/${userId}`, {
        headers: getAuthHeaders()
      });
      await fetchUsers();
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'Failed to delete user');
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return {
    users,
    loading,
    error,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    refetch: () => fetchUsers()
  };
}

