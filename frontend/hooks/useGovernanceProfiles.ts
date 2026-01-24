import { useState, useEffect } from 'react';
import axios from 'axios';
import { getValidAuthToken, handleAuthError } from '@/utils/auth';

// Ensure API_URL always includes /api prefix
const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const API_URL = baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;

interface GovernanceProfile {
  id: string;
  name: string;
  domain: string;
  description?: string;
  version: number;
  status: 'draft' | 'active' | 'archived';
  allowed_actions: string[];
  risk_thresholds: Record<string, any>;
  human_review_requirement: 'required' | 'conditional' | 'optional';
  assignment_rules: Record<string, any>;
  metadata?: Record<string, any>;
  created_by?: string;
  created_at: string;
  updated_at: string;
  activated_at?: string;
  activated_by?: string;
  archived_at?: string;
  archived_by?: string;
  version_hash?: string;
  rules?: Array<{
    id: string;
    rule_type: string;
    rule_key: string;
    rule_value: any;
    priority: number;
  }>;
  data_controls?: Array<{
    id: string;
    control_type: string;
    control_config: Record<string, any>;
    is_required: boolean;
  }>;
}

interface AuditEntry {
  id: string;
  profile_id: string;
  action: string;
  performed_by: string;
  performed_at: string;
  changes: Record<string, any>;
  justification?: string;
  ledger_hash?: string;
  ledger_timestamp?: string;
}

export function useGovernanceProfiles() {
  const [profiles, setProfiles] = useState<GovernanceProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getAuthToken = async () => {
    // Use the utility function to get a valid token (refreshes if needed)
    return await getValidAuthToken();
  };

  const fetchProfiles = async (filters?: { domain?: string; status?: string; name?: string }) => {
    try {
      setLoading(true);
      setError(null);
      
      const token = await getAuthToken();
      const params = new URLSearchParams();
      if (filters?.domain) params.append('domain', filters.domain);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.name) params.append('name', filters.name);
      
      const response = await axios.get(`${API_URL}/governance-profiles?${params.toString()}`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : undefined,
        },
      });
      
      setProfiles(response.data.profiles || []);
    } catch (err: any) {
      // Try to handle auth error
      const shouldRetry = await handleAuthError(err);
      if (shouldRetry) {
        // Retry the request once with refreshed token
        try {
          const token = await getAuthToken();
          const params = new URLSearchParams();
          if (filters?.domain) params.append('domain', filters.domain);
          if (filters?.status) params.append('status', filters.status);
          if (filters?.name) params.append('name', filters.name);
          
          const response = await axios.get(`${API_URL}/governance-profiles?${params.toString()}`, {
            headers: {
              Authorization: token ? `Bearer ${token}` : undefined,
            },
          });
          
          setProfiles(response.data.profiles || []);
          return;
        } catch (retryErr: any) {
          setError(retryErr.response?.data?.error || 'Failed to fetch profiles after token refresh');
          console.error('Error fetching profiles after retry:', retryErr);
        }
      } else {
        setError(err.response?.data?.error || 'Failed to fetch profiles');
        console.error('Error fetching profiles:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async (id: string): Promise<GovernanceProfile | null> => {
    try {
      const token = await getAuthToken();
      const response = await axios.get(`${API_URL}/governance-profiles/${id}`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : undefined,
        },
      });
      
      return response.data.profile;
    } catch (err: any) {
      const shouldRetry = await handleAuthError(err);
      if (shouldRetry) {
        // Retry once with refreshed token
        const token = await getAuthToken();
        const response = await axios.get(`${API_URL}/governance-profiles/${id}`, {
          headers: {
            Authorization: token ? `Bearer ${token}` : undefined,
          },
        });
        return response.data.profile;
      }
      console.error('Error fetching profile:', err);
      throw err;
    }
  };

  const createProfile = async (profileData: Partial<GovernanceProfile>): Promise<GovernanceProfile> => {
    try {
      const token = await getAuthToken();
      const response = await axios.post(`${API_URL}/governance-profiles`, profileData, {
        headers: {
          Authorization: token ? `Bearer ${token}` : undefined,
        },
      });
      
      const newProfile = response.data.profile;
      
      // Add to local state immediately
      setProfiles(prevProfiles => [...prevProfiles, newProfile]);
      
      return newProfile;
    } catch (err: any) {
      const shouldRetry = await handleAuthError(err);
      if (shouldRetry) {
        const token = await getAuthToken();
        const response = await axios.post(`${API_URL}/governance-profiles`, profileData, {
          headers: {
            Authorization: token ? `Bearer ${token}` : undefined,
          },
        });
        
        const newProfile = response.data.profile;
        
        // Add to local state immediately
        setProfiles(prevProfiles => [...prevProfiles, newProfile]);
        
        return newProfile;
      }
      console.error('Error creating profile:', err);
      throw err;
    }
  };

  const updateProfile = async (id: string, profileData: Partial<GovernanceProfile>): Promise<GovernanceProfile> => {
    try {
      const token = await getAuthToken();
      const response = await axios.put(`${API_URL}/governance-profiles/${id}`, profileData, {
        headers: {
          Authorization: token ? `Bearer ${token}` : undefined,
        },
      });
      
      const updatedProfile = response.data.profile;
      
      // Update local state immediately
      setProfiles(prevProfiles => 
        prevProfiles.map(p => p.id === id ? updatedProfile : p)
      );
      
      return updatedProfile;
    } catch (err: any) {
      // Check if it's a 401 error and try to refresh token
      const shouldRetry = await handleAuthError(err);
      if (shouldRetry) {
        // Retry the request once with refreshed token
        try {
          const token = await getAuthToken();
          const response = await axios.put(`${API_URL}/governance-profiles/${id}`, profileData, {
            headers: {
              Authorization: token ? `Bearer ${token}` : undefined,
            },
          });
          
          const updatedProfile = response.data.profile;
          
          // Update local state immediately
          setProfiles(prevProfiles => 
            prevProfiles.map(p => p.id === id ? updatedProfile : p)
          );
          
          return updatedProfile;
        } catch (retryErr: any) {
          console.error('Error updating profile after retry:', retryErr);
          console.error('Error response data:', retryErr.response?.data);
          throw retryErr;
        }
      }
      
      // Log detailed error information
      console.error('Error updating profile:', err);
      console.error('Error response status:', err.response?.status);
      console.error('Error response data:', err.response?.data);
      console.error('Error message:', err.message);
      console.error('Error code:', err.code);
      
      // Provide more helpful error message
      if (err.code === 'ERR_CONNECTION_REFUSED' || err.code === 'ERR_NETWORK') {
        throw new Error(
          'Cannot connect to backend server. Please ensure the backend is running:\n\n' +
          '1. If using Docker: docker-compose up backend\n' +
          '2. If running locally: cd backend && npm run dev\n' +
          '3. Check: http://localhost:3001/health'
        );
      } else if (err.response?.status === 401) {
        throw new Error('Authentication failed. Please log in again.');
      } else if (err.response?.status === 403) {
        throw new Error('You do not have permission to update this profile.');
      } else if (err.message === 'Network Error') {
        throw new Error('Network error. Please check if the backend server is running on port 3001.');
      }
      
      throw err;
    }
  };

  const activateProfile = async (id: string, justification?: string): Promise<GovernanceProfile> => {
    try {
      const token = await getAuthToken();
      const response = await axios.post(
        `${API_URL}/governance-profiles/${id}/activate`,
        { justification },
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : undefined,
          },
        }
      );
      
      const activatedProfile = response.data.profile;
      
      // Update local state immediately
      setProfiles(prevProfiles => 
        prevProfiles.map(p => p.id === id ? activatedProfile : p)
      );
      
      return activatedProfile;
    } catch (err: any) {
      const shouldRetry = await handleAuthError(err);
      if (shouldRetry) {
        const token = await getAuthToken();
        const response = await axios.post(
          `${API_URL}/governance-profiles/${id}/activate`,
          { justification },
          {
            headers: {
              Authorization: token ? `Bearer ${token}` : undefined,
            },
          }
        );
        
        const activatedProfile = response.data.profile;
        
        // Update local state immediately
        setProfiles(prevProfiles => 
          prevProfiles.map(p => p.id === id ? activatedProfile : p)
        );
        
        return activatedProfile;
      }
      console.error('Error activating profile:', err);
      throw err;
    }
  };

  const archiveProfile = async (id: string, justification?: string): Promise<GovernanceProfile> => {
    try {
      const token = await getAuthToken();
      const response = await axios.post(
        `${API_URL}/governance-profiles/${id}/archive`,
        { justification },
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : undefined,
          },
        }
      );
      
      return response.data.profile;
    } catch (err: any) {
      const shouldRetry = await handleAuthError(err);
      if (shouldRetry) {
        const token = await getAuthToken();
        const response = await axios.post(
          `${API_URL}/governance-profiles/${id}/archive`,
          { justification },
          {
            headers: {
              Authorization: token ? `Bearer ${token}` : undefined,
            },
          }
        );
        
        const archivedProfile = response.data.profile;
        
        // Update local state immediately
        setProfiles(prevProfiles => 
          prevProfiles.map(p => p.id === id ? archivedProfile : p)
        );
        
        return archivedProfile;
      }
      console.error('Error archiving profile:', err);
      throw err;
    }
  };

  const fetchAuditHistory = async (id: string): Promise<AuditEntry[]> => {
    try {
      const token = await getAuthToken();
      const response = await axios.get(`${API_URL}/governance-profiles/${id}/audit`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : undefined,
        },
      });
      
      return response.data.audit_history || [];
    } catch (err: any) {
      const shouldRetry = await handleAuthError(err);
      if (shouldRetry) {
        const token = await getAuthToken();
        const response = await axios.get(`${API_URL}/governance-profiles/${id}/audit`, {
          headers: {
            Authorization: token ? `Bearer ${token}` : undefined,
          },
        });
        return response.data.audit_history || [];
      }
      console.error('Error fetching audit history:', err);
      return [];
    }
  };

  const exportProfile = async (
    id: string,
    options: {
      format: 'pdf' | 'json';
      scope: 'this_version';
      justification: string;
      redactionLevel?: string;
      watermarkLabel?: string;
    }
  ): Promise<{ artifact_hash: string; timestamp: string; download_url?: string }> => {
    try {
      const token = await getAuthToken();
      const response = await axios.post(
        `${API_URL}/governance-profiles/${id}/export`,
        options,
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : undefined,
          },
        }
      );
      
      return response.data;
    } catch (err: any) {
      const shouldRetry = await handleAuthError(err);
      if (shouldRetry) {
        const token = await getAuthToken();
        const response = await axios.post(
          `${API_URL}/governance-profiles/${id}/export`,
          options,
          {
            headers: {
              Authorization: token ? `Bearer ${token}` : undefined,
            },
          }
        );
        return response.data;
      }
      console.error('Error exporting profile:', err);
      throw err;
    }
  };

  const createNewVersion = async (id: string): Promise<GovernanceProfile> => {
    try {
      const token = await getAuthToken();
      const response = await axios.post(
        `${API_URL}/governance-profiles/${id}/create-version`,
        {},
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : undefined,
          },
        }
      );
      
      return response.data.profile;
    } catch (err: any) {
      const shouldRetry = await handleAuthError(err);
      if (shouldRetry) {
        const token = await getAuthToken();
        const response = await axios.post(
          `${API_URL}/governance-profiles/${id}/create-version`,
          {},
          {
            headers: {
              Authorization: token ? `Bearer ${token}` : undefined,
            },
          }
        );
        return response.data.profile;
      }
      console.error('Error creating new version:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  return {
    profiles,
    loading,
    error,
    fetchProfiles,
    fetchProfile,
    createProfile,
    updateProfile,
    activateProfile,
    archiveProfile,
    fetchAuditHistory,
    exportProfile,
    createNewVersion,
  };
}

export type { GovernanceProfile, AuditEntry };

