'use client';

import { useReviews } from '@/hooks/useReviews';
import {
  Box,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Spinner,
  Button,
  HStack,
  Badge,
  Textarea,
  useToast,
} from '@chakra-ui/react';
import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';

export default function ReviewsPage() {
  const { reviews, loading, approveReview, rejectReview, refetch } = useReviews();
  const toast = useToast();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState<string | null>(null);

  const handleApprove = async (taskId: string) => {
    setProcessing(taskId);
    try {
      await approveReview(taskId, notes[taskId] || '');
      toast({ title: 'Review approved', status: 'success' });
      await refetch();
    } catch (error) {
      toast({ title: 'Failed to approve', status: 'error' });
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (taskId: string) => {
    if (!notes[taskId]) {
      toast({ title: 'Review notes required', status: 'warning' });
      return;
    }
    setProcessing(taskId);
    try {
      await rejectReview(taskId, notes[taskId]);
      toast({ title: 'Review rejected', status: 'success' });
      await refetch();
    } catch (error) {
      toast({ title: 'Failed to reject', status: 'error' });
    } finally {
      setProcessing(null);
    }
  };

  return (
    <DashboardLayout>
      <Box>
        <Heading size="lg" mb={6} color="gray.800" fontWeight="600">
          Review Tasks
        </Heading>

        {loading ? (
          <Spinner size="xl" />
        ) : (
          <Box overflowX="auto" border="1px solid" borderColor="gray.200" borderRadius="md" boxShadow="sm" bg="white">
            <Table variant="simple" size="sm">
              <Thead bg="gray.50">
                <Tr>
                  <Th color="gray.600" fontWeight="600" fontSize="xs" textTransform="uppercase">
                    Task Type
                  </Th>
                  <Th color="gray.600" fontWeight="600" fontSize="xs" textTransform="uppercase">
                    Status
                  </Th>
                  <Th color="gray.600" fontWeight="600" fontSize="xs" textTransform="uppercase">
                    Priority
                  </Th>
                  <Th color="gray.600" fontWeight="600" fontSize="xs" textTransform="uppercase">
                    Model
                  </Th>
                  <Th color="gray.600" fontWeight="600" fontSize="xs" textTransform="uppercase">
                    Notes
                  </Th>
                  <Th color="gray.600" fontWeight="600" fontSize="xs" textTransform="uppercase">
                    Actions
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {reviews && reviews.length > 0 ? (
                  reviews.map((review: any) => (
                    <Tr key={review.id} _hover={{ bg: 'gray.50' }}>
                      <Td color="gray.700">{review.task_type}</Td>
                      <Td>
                        <Badge
                          colorScheme={
                            review.status === 'pending'
                              ? 'yellow'
                              : review.status === 'approved'
                              ? 'green'
                              : 'red'
                          }
                          fontSize="xs"
                        >
                          {review.status}
                        </Badge>
                      </Td>
                      <Td color="gray.600">{review.priority}</Td>
                      <Td color="gray.600">{review.model_name}</Td>
                      <Td>
                        <Textarea
                          size="sm"
                          placeholder="Review notes..."
                          value={notes[review.id] || ''}
                          onChange={(e) => setNotes({ ...notes, [review.id]: e.target.value })}
                          borderColor="gray.300"
                          _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px #5ca3ff' }}
                        />
                      </Td>
                      <Td>
                        <HStack spacing={2}>
                          <Button
                            size="sm"
                            colorScheme="green"
                            onClick={() => handleApprove(review.id)}
                            isLoading={processing === review.id}
                            isDisabled={review.status !== 'pending'}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            colorScheme="red"
                            onClick={() => handleReject(review.id)}
                            isLoading={processing === review.id}
                            isDisabled={review.status !== 'pending'}
                          >
                            Reject
                          </Button>
                        </HStack>
                      </Td>
                    </Tr>
                  ))
                ) : (
                  <Tr>
                    <Td colSpan={6} textAlign="center" color="gray.500" py={8}>
                      No review tasks available
                    </Td>
                  </Tr>
                )}
              </Tbody>
            </Table>
          </Box>
        )}
      </Box>
    </DashboardLayout>
  );
}
