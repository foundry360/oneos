import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function useFiles() {
  const queryClient = useQueryClient();

  const { data: files, isLoading, refetch } = useQuery(
    'files',
    async () => {
      const token = localStorage.getItem('auth-token');
      const response = await axios.get(`${API_URL}/api/files`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      return response.data.files || [];
    }
  );

  const uploadMutation = useMutation(
    async (file: File) => {
      const token = localStorage.getItem('auth-token');
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await axios.post(`${API_URL}/api/files/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('files');
      },
    }
  );

  return {
    files,
    loading: isLoading,
    uploadFile: uploadMutation.mutateAsync,
    refetch,
  };
}







