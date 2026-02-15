import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function useReviews() {
  const queryClient = useQueryClient();

  const { data: reviews, isLoading, refetch } = useQuery(
    'reviews',
    async () => {
      const token = localStorage.getItem('auth-token');
      const response = await axios.get(`${API_URL}/api/review`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      return response.data.tasks || [];
    }
  );

  const approveMutation = useMutation(
    async ({ taskId, notes }: { taskId: string; notes: string }) => {
      const token = localStorage.getItem('auth-token');
      const response = await axios.post(
        `${API_URL}/api/review/${taskId}/approve`,
        { reviewNotes: notes },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('reviews');
      },
    }
  );

  const rejectMutation = useMutation(
    async ({ taskId, notes }: { taskId: string; notes: string }) => {
      const token = localStorage.getItem('auth-token');
      const response = await axios.post(
        `${API_URL}/api/review/${taskId}/reject`,
        { reviewNotes: notes },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('reviews');
      },
    }
  );

  return {
    reviews,
    loading: isLoading,
    approveReview: (taskId: string, notes: string) =>
      approveMutation.mutateAsync({ taskId, notes }),
    rejectReview: (taskId: string, notes: string) =>
      rejectMutation.mutateAsync({ taskId, notes }),
    refetch,
  };
}







