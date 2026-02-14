'use client';

import { useBlockchain } from '@/hooks/useBlockchain';
import { useTransactions, Transaction } from '@/hooks/useTransactions';
import {
  Box,
  Heading,
  Grid,
  GridItem,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Badge,
  VStack,
  HStack,
  Text,
  Spinner,
  Code,
  Divider,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
} from '@chakra-ui/react';
import DashboardLayout from '@/components/DashboardLayout';

export default function BlockchainPage() {
  const { blockchain, loading, error } = useBlockchain();
  const { transactions, loading: transactionsLoading } = useTransactions();

  return (
    <DashboardLayout>
      <VStack align="stretch" spacing={6}>
        <Heading size="lg" color="gray.800" fontWeight="600">
          Blockchain Explorer
        </Heading>

        {loading ? (
          <Box textAlign="center" py={12}>
            <Spinner size="xl" />
            <Text mt={4} color="gray.600">Loading blockchain data...</Text>
          </Box>
        ) : error ? (
          <Box p={6} bg="red.50" border="1px solid" borderColor="red.200" borderRadius="md">
            <Text color="red.600" fontWeight="medium">Error loading blockchain</Text>
            <Text color="red.500" fontSize="sm" mt={2}>
              {error?.response?.data?.message || error?.message || 'Unknown error'}
            </Text>
          </Box>
        ) : !blockchain ? (
          <Box p={6} bg="yellow.50" border="1px solid" borderColor="yellow.200" borderRadius="md">
            <Text color="yellow.600" fontWeight="medium">Blockchain not available</Text>
            <Text color="yellow.500" fontSize="sm" mt={2}>
              Fabric service is not enabled or not configured
            </Text>
          </Box>
        ) : (
          <>
            {/* Status Card */}
            <Box p={6} bg="white" border="1px solid" borderColor="gray.200" borderRadius="md" boxShadow="sm">
              <HStack justify="space-between" mb={4}>
                <Heading size="md" color="gray.700">Status</Heading>
                <Badge colorScheme="green" fontSize="md" px={3} py={1}>
                  {blockchain.status === 'available' ? 'Online' : 'Offline'}
                </Badge>
              </HStack>
            </Box>

            {/* Stats Grid */}
            <Grid templateColumns="repeat(2, 1fr)" gap={6}>
              {/* Channel Info */}
              <GridItem>
                <Box p={6} bg="white" border="1px solid" borderColor="gray.200" borderRadius="md" boxShadow="sm">
                  <Stat>
                    <StatLabel color="gray.600" fontSize="sm" fontWeight="600" textTransform="uppercase">
                      Channel
                    </StatLabel>
                    <StatNumber fontSize="2xl" color="gray.800" mt={2}>
                      {blockchain.channel?.name || 'N/A'}
                    </StatNumber>
                    <StatHelpText color="gray.500" mt={2}>
                      Block Height: {blockchain.channel?.height || '0'}
                    </StatHelpText>
                  </Stat>
                </Box>
              </GridItem>

              {/* Chaincode Info */}
              <GridItem>
                <Box p={6} bg="white" border="1px solid" borderColor="gray.200" borderRadius="md" boxShadow="sm">
                  <Stat>
                    <StatLabel color="gray.600" fontSize="sm" fontWeight="600" textTransform="uppercase">
                      Chaincode
                    </StatLabel>
                    <StatNumber fontSize="2xl" color="gray.800" mt={2}>
                      {blockchain.chaincode?.name || 'N/A'}
                    </StatNumber>
                    <StatHelpText color="gray.500" mt={2}>
                      Version: {blockchain.chaincode?.version || 'N/A'}
                    </StatHelpText>
                  </Stat>
                </Box>
              </GridItem>
            </Grid>

            {/* Details and Transactions Row */}
            <Grid templateColumns="25% 75%" gap={6}>
              {/* Details Section - Column 1 (25%) */}
              <GridItem>
                <Box p={6} bg="white" border="1px solid" borderColor="gray.200" borderRadius="md" boxShadow="sm" h="100%">
                  <Heading size="sm" color="gray.700" mb={4}>Details</Heading>
                  <VStack align="stretch" spacing={3}>
                    <HStack justify="space-between">
                      <Text color="gray.600" fontSize="sm">Channel Name:</Text>
                      <Code fontSize="sm">{blockchain.channel?.name || 'N/A'}</Code>
                    </HStack>
                    <Divider />
                    <HStack justify="space-between">
                      <Text color="gray.600" fontSize="sm">Chaincode Name:</Text>
                      <Code fontSize="sm">{blockchain.chaincode?.name || 'N/A'}</Code>
                    </HStack>
                    <Divider />
                    <HStack justify="space-between">
                      <Text color="gray.600" fontSize="sm">Chaincode Version:</Text>
                      <Code fontSize="sm">{blockchain.chaincode?.version || 'N/A'}</Code>
                    </HStack>
                    <Divider />
                    <HStack justify="space-between">
                      <Text color="gray.600" fontSize="sm">Status:</Text>
                      <Badge colorScheme={blockchain.chaincode?.status === 'active' ? 'green' : 'gray'}>
                        {blockchain.chaincode?.status || 'N/A'}
                      </Badge>
                    </HStack>
                    {blockchain.channel?.currentBlockHash && (
                      <>
                        <Divider />
                        <VStack align="stretch" spacing={1}>
                          <Text color="gray.600" fontSize="sm">Current Block Hash:</Text>
                          <Code fontSize="xs" p={2} bg="gray.50" borderRadius="md" wordBreak="break-all">
                            {blockchain.channel.currentBlockHash}
                          </Code>
                        </VStack>
                      </>
                    )}
                  </VStack>
                </Box>
              </GridItem>

              {/* Transactions Table - Column 2 (75%) */}
              <GridItem>
                <Box p={6} bg="white" border="1px solid" borderColor="gray.200" borderRadius="md" boxShadow="sm" h="100%">
                  <Heading size="sm" color="gray.700" mb={4}>Transactions</Heading>
                  {transactionsLoading ? (
                    <Box textAlign="center" py={8}>
                      <Spinner size="md" />
                      <Text mt={2} color="gray.600" fontSize="sm">Loading transactions...</Text>
                    </Box>
                  ) : transactions.length === 0 ? (
                    <Box textAlign="center" py={8}>
                      <Text color="gray.500" fontSize="sm">No transactions found</Text>
                      <Text color="gray.400" fontSize="xs" mt={1}>
                        Transactions will appear here once the chaincode is active
                      </Text>
                    </Box>
                  ) : (
                    <TableContainer>
                      <Table variant="simple" size="sm">
                        <Thead>
                          <Tr>
                            <Th color="gray.600" fontSize="xs" fontWeight="600" textTransform="uppercase">Tx ID</Th>
                            <Th color="gray.600" fontSize="xs" fontWeight="600" textTransform="uppercase">Timestamp</Th>
                            <Th color="gray.600" fontSize="xs" fontWeight="600" textTransform="uppercase">Function</Th>
                            <Th color="gray.600" fontSize="xs" fontWeight="600" textTransform="uppercase">Status</Th>
                            <Th color="gray.600" fontSize="xs" fontWeight="600" textTransform="uppercase">Block</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {transactions.map((tx: Transaction, index: number) => (
                            <Tr key={tx.txId || index}>
                              <Td>
                                <Code fontSize="xs" color="gray.700">
                                  {tx.txId ? `${tx.txId.substring(0, 16)}...` : 'N/A'}
                                </Code>
                              </Td>
                              <Td fontSize="xs" color="gray.600">
                                {tx.timestamp ? new Date(tx.timestamp).toLocaleString() : 'N/A'}
                              </Td>
                              <Td fontSize="xs" color="gray.700">
                                {tx.functionName || tx.chaincodeName || 'N/A'}
                              </Td>
                              <Td>
                                <Badge 
                                  colorScheme={tx.status === 'VALID' ? 'green' : 'red'} 
                                  fontSize="xs"
                                >
                                  {tx.status || 'UNKNOWN'}
                                </Badge>
                              </Td>
                              <Td fontSize="xs" color="gray.600">
                                {tx.blockNumber || 'N/A'}
                              </Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </TableContainer>
                  )}
                </Box>
              </GridItem>
            </Grid>
          </>
        )}
      </VStack>
    </DashboardLayout>
  );
}


