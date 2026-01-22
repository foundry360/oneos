import { useState, useEffect } from 'react';
import axios from 'axios';

// Ensure API_URL always includes /api prefix
const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const API_URL = baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;

interface GovernanceProfile {
  id: string;
  name: string;
  domain: string;
  description?: string;
  version: number;
  status: 'draft' | 'active' | 'deprecated';
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
  deprecated_at?: string;
  deprecated_by?: string;
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

  const getAuthToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth-token');
    }
    return null;
  };

  const fetchProfiles = async (filters?: { domain?: string; status?: string; name?: string }) => {
    try {
      setLoading(true);
      setError(null);
      
      const token = getAuthToken();
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
      setError(err.response?.data?.error || 'Failed to fetch profiles');
      console.error('Error fetching profiles:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async (id: string): Promise<GovernanceProfile | null> => {
    try {
      const token = getAuthToken();
      const response = await axios.get(`${API_URL}/governance-profiles/${id}`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : undefined,
        },
      });
      
      return response.data.profile;
    } catch (err: any) {
      console.error('Error fetching profile:', err);
      throw err;
    }
  };

  const createProfile = async (profileData: Partial<GovernanceProfile>): Promise<GovernanceProfile> => {
    try {
      const token = getAuthToken();
      const response = await axios.post(`${API_URL}/governance-profiles`, profileData, {
        headers: {
          Authorization: token ? `Bearer ${token}` : undefined,
        },
      });
      
      return response.data.profile;
    } catch (err: any) {
      console.error('Error creating profile:', err);
      throw err;
    }
  };

  const updateProfile = async (id: string, profileData: Partial<GovernanceProfile>): Promise<GovernanceProfile> => {
    try {
      const token = getAuthToken();
      const response = await axios.put(`${API_URL}/governance-profiles/${id}`, profileData, {
        headers: {
          Authorization: token ? `Bearer ${token}` : undefined,
        },
      });
      
      return response.data.profile;
    } catch (err: any) {
      console.error('Error updating profile:', err);
      throw err;
    }
  };

  const activateProfile = async (id: string, justification?: string): Promise<GovernanceProfile> => {
    try {
      const token = getAuthToken();
      const response = await axios.post(
        `${API_URL}/governance-profiles/${id}/activate`,
        { justification },
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : undefined,
          },
        }
      );
      
      return response.data.profile;
    } catch (err: any) {
      console.error('Error activating profile:', err);
      throw err;
    }
  };

  const deprecateProfile = async (id: string, justification?: string): Promise<GovernanceProfile> => {
    try {
      const token = getAuthToken();
      const response = await axios.post(
        `${API_URL}/governance-profiles/${id}/deprecate`,
        { justification },
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : undefined,
          },
        }
      );
      
      return response.data.profile;
    } catch (err: any) {
      console.error('Error deprecating profile:', err);
      throw err;
    }
  };

  const fetchAuditHistory = async (id: string): Promise<AuditEntry[]> => {
    try {
      const token = getAuthToken();
      const response = await axios.get(`${API_URL}/governance-profiles/${id}/audit`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : undefined,
        },
      });
      
      return response.data.audit_history || [];
    } catch (err: any) {
      console.error('Error fetching audit history:', err);
      return [];
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
    deprecateProfile,
    fetchAuditHistory,
  };
}

export type { GovernanceProfile, AuditEntry };

