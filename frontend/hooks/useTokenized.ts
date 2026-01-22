import { useQuery } from 'react-query';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function useTokenized() {
  const { data: tokenized, isLoading } = useQuery(
    'tokenized',
    async () => {
      const token = localStorage.getItem('auth-token');
      const response = await axios.get(`${API_URL}/api/tokenization`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      return response.data.tokenizedData || [];
    }
  );

  return {
    tokenized,
    loading: isLoading,
  };
}

