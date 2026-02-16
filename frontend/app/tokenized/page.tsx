'use client';

import { useTokenized } from '@/hooks/useTokenized';
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
} from '@chakra-ui/react';
import DashboardLayout from '@/components/DashboardLayout';

export default function TokenizedPage() {
  const { tokenized, loading } = useTokenized();

  return (
    <DashboardLayout>
      <Box>
        <Heading size="lg" mb={6} color="gray.800" fontWeight="600">
          Tokenized Data
        </Heading>

        {loading ? (
          <Spinner size="xl" />
        ) : (
          <Box overflowX="auto" border="1px solid" borderColor="gray.200" borderRadius="md" boxShadow="sm" bg="white" className="scrollbar-hover">
            <Table variant="simple" size="sm">
              <Thead bg="gray.50">
                <Tr>
                  <Th color="gray.600" fontWeight="600" fontSize="xs" textTransform="uppercase">
                    Filename
                  </Th>
                  <Th color="gray.600" fontWeight="600" fontSize="xs" textTransform="uppercase">
                    Token Count
                  </Th>
                  <Th color="gray.600" fontWeight="600" fontSize="xs" textTransform="uppercase">
                    Method
                  </Th>
                  <Th color="gray.600" fontWeight="600" fontSize="xs" textTransform="uppercase">
                    Status
                  </Th>
                  <Th color="gray.600" fontWeight="600" fontSize="xs" textTransform="uppercase">
                    Created
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {tokenized && tokenized.length > 0 ? (
                  tokenized.map((item: any) => (
                    <Tr key={item.id} _hover={{ bg: 'gray.50' }}>
                      <Td color="gray.700">{item.filename}</Td>
                      <Td color="gray.600">{item.token_count}</Td>
                      <Td color="gray.600">{item.tokenization_method}</Td>
                      <Td color="gray.600">{item.status}</Td>
                      <Td color="gray.600">{new Date(item.created_at).toLocaleDateString()}</Td>
                    </Tr>
                  ))
                ) : (
                  <Tr>
                    <Td colSpan={5} textAlign="center" color="gray.500" py={8}>
                      No tokenized data available
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
