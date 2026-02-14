import { useQuery } from 'react-query';
import axios from 'axios';

// Ensure API_URL always includes /api prefix
const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_URL = baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;

export function useBlockchain() {
  const { data, isLoading, error, refetch } = useQuery(
    'blockchain-overview',
    async () => {
      const token = localStorage.getItem('auth-token');
      try {
        const response = await axios.get(
          `${API_URL}/blockchain/overview`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }
        );
        return response.data;
      } catch (err: any) {
        if (err.response?.status === 401) {
          localStorage.removeItem('auth-token');
        }
        throw err;
      }
    },
    {
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  return {
    blockchain: data,
    loading: isLoading,
    error,
    refetch,
  };
}



