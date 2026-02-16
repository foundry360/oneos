import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Decision, DecisionStatus, RiskLevel, DecisionScope, ActionMode, DecisionAction } from '@/components/control-plane/types';

const getApiUrl = () => {
  const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  return url.endsWith('/api') ? url.slice(0, -4) : url;
};

const API_BASE_URL = getApiUrl();

interface FetchDecisionsParams {
  status?: DecisionStatus | null;
  riskLevel?: RiskLevel | null;
  scope?: DecisionScope | null;
  actionMode?: ActionMode | null;
  search?: string;
  page?: number;
  limit?: number;
}

export function useDecisions() {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  });

  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth-token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchDecisions = useCallback(async (params: FetchDecisionsParams = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      const queryParams = new URLSearchParams();
      if (params.status) {
        queryParams.append('status', params.status || '');
      }
      if (params.riskLevel) {
        queryParams.append('riskLevel', params.riskLevel);
      }
      if (params.scope) {
        queryParams.append('scope', params.scope);
      }
      if (params.actionMode) {
        queryParams.append('actionMode', params.actionMode);
      }
      if (params.search) {
        queryParams.append('search', params.search);
      }
      if (params.page) {
        queryParams.append('page', params.page.toString());
      }
      if (params.limit) {
        queryParams.append('limit', params.limit.toString());
      }

      const response = await axios.get(`${API_BASE_URL}/api/decisions?${queryParams.toString()}`, {
        headers: getAuthHeaders()
      });

      setDecisions(response.data.decisions || []);
      setPagination(response.data.pagination || {
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 0
      });
    } catch (err: any) {
      console.error('Failed to fetch decisions:', err);
      setError(err.response?.data?.error || err.message || 'Failed to fetch decisions');
      setDecisions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const takeAction = async (decisionId: string, action: DecisionAction, justification: string) => {
    try {
      await axios.put(
        `${API_BASE_URL}/api/decisions/${decisionId}/action`,
        { action, justification },
        { headers: getAuthHeaders() }
      );
      
      // Refresh decisions after action
      await fetchDecisions({});
      return true;
    } catch (err: any) {
      console.error('Failed to take action on decision:', err);
      throw new Error(err.response?.data?.error || err.message || 'Failed to take action');
    }
  };

  return {
    decisions,
    loading,
    error,
    pagination,
    fetchDecisions,
    takeAction,
    refetch: () => fetchDecisions({})
  };
}


