import { useQuery } from 'react-query';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function useDashboard() {
  const { data: stats, isLoading, refetch } = useQuery(
    'dashboard-stats',
    async () => {
      const token = localStorage.getItem('auth-token');
      const response = await axios.get(`${API_URL}/api/dashboard/stats`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      return response.data;
    },
    {
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  return {
    stats,
    loading: isLoading,
    refetch,
  };
}




