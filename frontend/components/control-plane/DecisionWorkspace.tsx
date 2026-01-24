/**
 * Decision Workspace (Center Panel)
 * 
 * Purpose: Primary work surface.
 * Displays decisions requiring attention.
 * 
 * Rules:
 * - No modals from this panel
 * - Keyboard navigable
 * - No visual embellishments
 * - Minimal table or list (no cards)
 */

'use client';

import { Box, Table, Thead, Tbody, Tr, Th, Td, Input, HStack, Text, Badge, VStack, Menu, MenuButton, MenuList, MenuItem, Button, Tooltip } from '@chakra-ui/react';
import { Decision, RiskLevel, DecisionStatus } from './types';
import { useMemo, useState, KeyboardEvent, useEffect } from 'react';
import { ChevronsUp, ChevronDown, Search, ChevronDown as ChevronDownIcon, Clock, CheckCircle2, XCircle, AlertCircle, CircleArrowUp, BookCheck, Check, X, Info } from 'lucide-react';

interface DecisionWorkspaceProps {
  decisions: Decision[];
  selectedDecision: Decision | null;
  onSelectDecision: (decision: Decision | null) => void;
  searchFilter: string;
  onSearchChange: (value: string) => void;
  statusFilter: DecisionStatus | null;
  onStatusFilterChange: (status: DecisionStatus | null) => void;
  riskFilter: RiskLevel | null;
  onRiskFilterChange: (risk: RiskLevel | null) => void;
}

export default function DecisionWorkspace({
  decisions,
  selectedDecision,
  onSelectDecision,
  searchFilter,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  riskFilter,
  onRiskFilterChange,
}: DecisionWorkspaceProps) {
  const [keyboardIndex, setKeyboardIndex] = useState<number>(-1);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Filter decisions based on search, status, and risk
  const filteredDecisions = useMemo(() => {
    return decisions.filter((decision) => {
      const matchesSearch =
        searchFilter === '' ||
        decision.id.toLowerCase().includes(searchFilter.toLowerCase()) ||
        decision.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
        (decision.assignedTo && decision.assignedTo.toLowerCase().includes(searchFilter.toLowerCase()));

      const matchesStatus = statusFilter === null || decision.status === statusFilter;
      const matchesRisk = riskFilter === null || decision.riskLevel === riskFilter;

      return matchesSearch && matchesStatus && matchesRisk;
    });
  }, [decisions, searchFilter, statusFilter, riskFilter]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchFilter, statusFilter, riskFilter]);

  // Auto-select first decision when filtered decisions change
  // This handles: initial load, scope/action mode changes, and search/status/risk filter changes
  useEffect(() => {
    if (filteredDecisions.length > 0) {
      // Check if current selection is still in the filtered list
      const isCurrentSelectionValid = selectedDecision && 
        filteredDecisions.some(d => d.id === selectedDecision.id);
      
      // If no valid selection, select the first decision
      if (!isCurrentSelectionValid) {
        onSelectDecision(filteredDecisions[0]);
      }
    } else if (filteredDecisions.length === 0) {
      // If no decisions match filters, clear selection
      onSelectDecision(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredDecisions]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredDecisions.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedDecisions = filteredDecisions.slice(startIndex, endIndex);

  const getRiskColor = (risk: RiskLevel): string => {
    switch (risk) {
      case 'high':
        return 'red.600';
      case 'medium':
        return 'orange.600';
      case 'low':
        return 'yellow.600';
      default:
        return 'gray.600';
    }
  };

  const getRiskIcon = (risk: RiskLevel) => {
    let color: string;
    switch (risk) {
      case 'high':
        color = '#DC2626'; // red.600 - darker red
        break;
      case 'medium':
        color = '#F97316'; // orange.500 - brighter orange
        break;
      case 'low':
        color = '#CA8A04'; // yellow.600
        break;
      default:
        color = '#6B7280'; // gray.600
    }
    
    if (risk === 'medium') {
      // Medium risk: 2 horizontal bars
      return (
        <VStack spacing={0.5} alignItems="center" justifyContent="center">
          {Array.from({ length: 2 }).map((_, index) => (
            <Box
              key={index}
              width="14px"
              height="2px"
              bg={color}
              borderRadius="1px"
            />
          ))}
        </VStack>
      );
            } else if (risk === 'high') {
              // High risk: chevrons-up in red
              return (
                <Box display="flex" alignItems="center" justifyContent="center">
                  <ChevronsUp
                    size={20}
                    style={{ color }}
                  />
                </Box>
              );
            } else {
              // Low risk: chevron-down in yellow
              return (
                <Box display="flex" alignItems="center" justifyContent="center">
                  <ChevronDown
                    size={20}
                    style={{ color }}
                  />
                </Box>
              );
            }
  };

  const getStatusColor = (status: DecisionStatus): string => {
    switch (status) {
      case 'pending':
        return 'yellow.600';
      case 'approved':
        return 'green.600';
      case 'rejected':
        return 'red.600';
      case 'escalated':
        return 'orange.600';
      case 'in-review':
        return 'blue.600';
      default:
        return 'gray.600';
    }
  };

  const getStatusBadge = (status: DecisionStatus) => {
    let dotColor: string;
    let statusText: string;
    
    switch (status) {
      case 'pending':
        dotColor = '#FFAA33';
        statusText = status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ');
        break;
      case 'approved':
        dotColor = '#16A34A';
        statusText = status.charAt(0).toUpperCase() + status.slice(1);
        break;
      case 'rejected':
        dotColor = '#DC2626';
        statusText = status.charAt(0).toUpperCase() + status.slice(1);
        break;
      case 'escalated':
        dotColor = '#EA580C';
        statusText = status.charAt(0).toUpperCase() + status.slice(1);
        break;
      case 'in-review':
        dotColor = '#2563EB';
        statusText = status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ');
        break;
      default:
        dotColor = '#6B7280';
        statusText = 'Unknown';
    }
    
    return (
      <Badge
        display="inline-flex"
        alignItems="center"
        gap={1.5}
        px={2}
        py={0.5}
        borderRadius="md"
        bg="blue.50"
        border="1px solid"
        borderColor="gray.200"
        fontSize="xs"
        fontWeight="500"
        textTransform="none"
      >
        <Box
          width="6px"
          height="6px"
          borderRadius="full"
          bg={dotColor}
        />
        <Text color="blue.700" textTransform="none">{statusText}</Text>
      </Badge>
    );
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setKeyboardIndex((prev) => {
        const next = prev < filteredDecisions.length - 1 ? prev + 1 : prev;
        if (next >= 0) {
          onSelectDecision(filteredDecisions[next]);
        }
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setKeyboardIndex((prev) => {
        const next = prev > 0 ? prev - 1 : -1;
        if (next >= 0) {
          onSelectDecision(filteredDecisions[next]);
        } else {
          onSelectDecision(null);
        }
        return next;
      });
    } else if (e.key === 'Escape') {
      onSelectDecision(null);
      setKeyboardIndex(-1);
    }
  };

  const statusOptions: DecisionStatus[] = ['pending', 'in-review', 'escalated', 'approved', 'rejected'];
  const riskOptions: RiskLevel[] = ['high', 'medium', 'low'];

  return (
    <Box
      width="55%"
      bg="white"
      display="flex"
      flexDirection="column"
      height="100%"
      overflow="hidden"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-label="Decision workspace"
    >
      {/* Header */}
      <Box 
        px={8} 
        py={5}
        borderBottom="1px solid"
        borderColor="gray.200"
      >
        <Text fontSize="sm" fontWeight="600" color="gray.900" letterSpacing="0.01em">
          Decision Context
        </Text>
      </Box>

      {/* Filters */}
      <Box
        px={8}
        py={3}
        borderBottom="1px solid"
        borderColor="gray.200"
        bg="white"
      >
        <HStack spacing={3} alignItems="center" flex={1}>
          <Box position="relative" maxW="300px" flex={1}>
            <Box
              as="button"
              position="absolute"
              left={3}
              top="50%"
              transform="translateY(-50%)"
              color="gray.400"
              pointerEvents="none"
              display="flex"
              alignItems="center"
              zIndex={1}
            >
              <Search size={14} />
            </Box>
            <Input
              placeholder="Search decisions..."
              value={searchFilter}
              onChange={(e) => onSearchChange(e.target.value)}
              size="sm"
              bg="white"
              border="1px solid"
              borderColor="gray.300"
              borderRadius="md"
              fontSize="xs"
              fontWeight="500"
              pl={9}
              pr={3}
              py={1.5}
              h="auto"
              _hover={{
                border: '1px solid',
                borderColor: 'gray.400',
              }}
              _focus={{
                border: '1px solid !important',
                borderColor: 'gray.400 !important',
                boxShadow: 'none !important',
                outline: 'none !important',
              }}
              _focusVisible={{
                border: '1px solid !important',
                borderColor: 'gray.400 !important',
                boxShadow: 'none !important',
                outline: 'none !important',
              }}
              aria-label="Search decisions"
            />
          </Box>
          
          <Menu>
            <MenuButton
              as={Button}
              rightIcon={<ChevronDownIcon size={14} />}
              size="sm"
              bg="white"
              border="1px solid"
              borderColor="gray.300"
              color="gray.700"
              fontSize="xs"
              fontWeight="500"
              px={3}
              py={1.5}
              h="32px"
              lineHeight="1"
              _hover={{
                bg: 'gray.50',
                borderColor: 'gray.400',
              }}
              _active={{
                bg: 'gray.50',
                borderColor: 'gray.400',
              }}
              _focus={{
                boxShadow: 'none',
                borderColor: 'gray.400',
              }}
            >
              {statusFilter 
                ? statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1).replace('-', ' ')
                : 'All Status'}
            </MenuButton>
            <MenuList
              bg="white"
              border="1px solid"
              borderColor="gray.300"
              boxShadow="sm"
              py={1}
              minW="160px"
            >
              <MenuItem
                onClick={() => onStatusFilterChange(null)}
                fontSize="xs"
                bg={!statusFilter ? 'gray.50' : 'white'}
                _hover={{ bg: 'gray.50' }}
                _focus={{ bg: 'gray.50' }}
              >
                <Text>All Status</Text>
              </MenuItem>
              {statusOptions.map((status) => {
                const getStatusDotColor = () => {
                  switch (status) {
                    case 'pending':
                      return '#FFAA33';
                    case 'approved':
                      return '#16A34A';
                    case 'rejected':
                      return '#DC2626';
                    case 'escalated':
                      return '#EA580C';
                    case 'in-review':
                      return '#2563EB';
                    default:
                      return '#6B7280';
                  }
                };
                return (
                  <MenuItem
                    key={status}
                    onClick={() => onStatusFilterChange(status)}
                    fontSize="xs"
                    bg={statusFilter === status ? 'gray.50' : 'white'}
                    _hover={{ bg: 'gray.50' }}
                    _focus={{ bg: 'gray.50' }}
                  >
                    <HStack spacing={2}>
                      <Box
                        width="6px"
                        height="6px"
                        borderRadius="full"
                        bg={getStatusDotColor()}
                      />
                      <Text>{status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}</Text>
                    </HStack>
                  </MenuItem>
                );
              })}
            </MenuList>
          </Menu>

          <Menu>
            <MenuButton
              as={Button}
              rightIcon={<ChevronDownIcon size={14} />}
              size="sm"
              bg="white"
              border="1px solid"
              borderColor="gray.300"
              color="gray.700"
              fontSize="xs"
              fontWeight="500"
              px={3}
              py={1.5}
              h="32px"
              lineHeight="1"
              _hover={{
                bg: 'gray.50',
                borderColor: 'gray.400',
              }}
              _active={{
                bg: 'gray.50',
                borderColor: 'gray.400',
              }}
              _focus={{
                boxShadow: 'none',
                borderColor: 'gray.400',
              }}
            >
              {riskFilter 
                ? riskFilter.charAt(0).toUpperCase() + riskFilter.slice(1)
                : 'All Risk'}
            </MenuButton>
            <MenuList
              bg="white"
              border="1px solid"
              borderColor="gray.300"
              boxShadow="sm"
              py={1}
              minW="140px"
            >
              <MenuItem
                onClick={() => onRiskFilterChange(null)}
                fontSize="xs"
                bg={!riskFilter ? 'gray.50' : 'white'}
                _hover={{ bg: 'gray.50' }}
                _focus={{ bg: 'gray.50' }}
              >
                <Text>All Risk</Text>
              </MenuItem>
              {riskOptions.map((risk) => {
                const getRiskDropdownIcon = () => {
                  if (risk === 'high') {
                    return <ChevronsUp size={14} style={{ color: '#DC2626' }} />;
                  } else if (risk === 'medium') {
                    return (
                      <VStack spacing={0.5} alignItems="center" justifyContent="center">
                        {Array.from({ length: 2 }).map((_, index) => (
                          <Box
                            key={index}
                            width="16px"
                            height="2px"
                            bg="#F97316"
                            borderRadius="1px"
                          />
                        ))}
                      </VStack>
                    );
                  } else {
                    return <ChevronDown size={14} style={{ color: '#CA8A04' }} />;
                  }
                };
                return (
                  <MenuItem
                    key={risk}
                    onClick={() => onRiskFilterChange(risk)}
                    fontSize="xs"
                    bg={riskFilter === risk ? 'gray.50' : 'white'}
                    _hover={{ bg: 'gray.50' }}
                    _focus={{ bg: 'gray.50' }}
                  >
                    <HStack spacing={2}>
                      {getRiskDropdownIcon()}
                      <Text>{risk.charAt(0).toUpperCase() + risk.slice(1)}</Text>
                    </HStack>
                  </MenuItem>
                );
              })}
            </MenuList>
          </Menu>
        </HStack>
      </Box>

      {/* Decision Table */}
      <Box flex="1" overflowY="auto">
        <Table variant="simple" size="sm">
          <Thead bg="transparent" position="sticky" top={0} zIndex={1}>
            <Tr>
              <Th
                px={8}
                py={4}
                fontSize="xs"
                fontWeight="600"
                color="gray.700"
                textTransform="uppercase"
                letterSpacing="0.05em"
                borderBottom="1px solid"
                borderColor="gray.200"
              >
                <HStack spacing={1.5} alignItems="center">
                  <Text>Decision ID</Text>
                  <Tooltip label="Unique identifier for this decision record" placement="top" fontSize="xs">
                    <Box as="span" display="inline-flex" alignItems="center" cursor="help">
                      <Info size={12} style={{ color: '#9CA3AF' }} />
                    </Box>
                  </Tooltip>
                </HStack>
              </Th>
              <Th
                px={8}
                py={4}
                fontSize="xs"
                fontWeight="600"
                color="gray.700"
                textTransform="uppercase"
                letterSpacing="0.05em"
                borderBottom="1px solid"
                borderColor="gray.200"
              >
                <HStack spacing={1.5} alignItems="center">
                  <Text>Risk Level</Text>
                  <Tooltip label="Risk assessment level: High (red chevrons up), Medium (orange bars), Low (yellow chevron down)" placement="top" fontSize="xs">
                    <Box as="span" display="inline-flex" alignItems="center" cursor="help">
                      <Info size={12} style={{ color: '#9CA3AF' }} />
                    </Box>
                  </Tooltip>
                </HStack>
              </Th>
              <Th
                px={8}
                py={4}
                fontSize="xs"
                fontWeight="600"
                color="gray.700"
                textTransform="uppercase"
                letterSpacing="0.05em"
                borderBottom="1px solid"
                borderColor="gray.200"
              >
                <HStack spacing={1.5} alignItems="center">
                  <Text>Type</Text>
                  <Tooltip label="Category or classification of the decision type" placement="top" fontSize="xs">
                    <Box as="span" display="inline-flex" alignItems="center" cursor="help">
                      <Info size={12} style={{ color: '#9CA3AF' }} />
                    </Box>
                  </Tooltip>
                </HStack>
              </Th>
              <Th
                px={8}
                py={4}
                fontSize="xs"
                fontWeight="600"
                color="gray.700"
                textTransform="uppercase"
                letterSpacing="0.05em"
                borderBottom="1px solid"
                borderColor="gray.200"
              >
                <HStack spacing={1.5} alignItems="center">
                  <Text>Status</Text>
                  <Tooltip label="Current status of the decision: Pending, In Review, Approved, Rejected, or Escalated" placement="top" fontSize="xs">
                    <Box as="span" display="inline-flex" alignItems="center" cursor="help">
                      <Info size={12} style={{ color: '#9CA3AF' }} />
                    </Box>
                  </Tooltip>
                </HStack>
              </Th>
              <Th
                px={8}
                py={4}
                fontSize="xs"
                fontWeight="600"
                color="gray.700"
                textTransform="uppercase"
                letterSpacing="0.05em"
                borderBottom="1px solid"
                borderColor="gray.200"
              >
                <HStack spacing={1.5} alignItems="center">
                  <Text>Assigned To</Text>
                  <Tooltip label="User assigned to review or handle this decision" placement="top" fontSize="xs">
                    <Box as="span" display="inline-flex" alignItems="center" cursor="help">
                      <Info size={12} style={{ color: '#9CA3AF' }} />
                    </Box>
                  </Tooltip>
                </HStack>
              </Th>
            </Tr>
          </Thead>
          <Tbody>
            {paginatedDecisions.length === 0 ? (
              <Tr>
                <Td colSpan={5} px={8} py={8} textAlign="center">
                  <Text fontSize="xs" color="gray.500">
                    No decisions match the current filters.
                  </Text>
                </Td>
              </Tr>
            ) : (
              paginatedDecisions.map((decision, index) => (
                <Tr
                  key={decision.id}
                  cursor="pointer"
                  bg={
                    selectedDecision?.id === decision.id
                      ? 'gray.50'
                      : 'white'
                  }
                  onClick={() => onSelectDecision(decision)}
                  _hover={{ bg: 'gray.100' }}
                  borderLeft={
                    selectedDecision?.id === decision.id ? '3px solid' : '3px solid transparent'
                  }
                  borderLeftColor={selectedDecision?.id === decision.id ? 'blue.500' : 'transparent'}
                  transition="all 0.1s"
                  aria-selected={selectedDecision?.id === decision.id}
                  role="row"
                >
                  <Td px={8} py={4} borderBottom="1px solid" borderColor="gray.200">
                    <HStack spacing={2} alignItems="center">
                      <BookCheck size={16} style={{ color: '#6B7280' }} />
                      <Text fontSize="xs" fontWeight="500" color="gray.900">
                        {decision.id}
                      </Text>
                    </HStack>
                  </Td>
                  <Td px={8} py={4} borderBottom="1px solid" borderColor="gray.200" textAlign="center">
                    <Box display="flex" justifyContent="center" alignItems="center">
                      {getRiskIcon(decision.riskLevel)}
                    </Box>
                  </Td>
                  <Td px={8} py={4} borderBottom="1px solid" borderColor="gray.200">
                    <Text fontSize="xs" color="gray.700">
                      {decision.type
                        .split('-')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' ')}
                    </Text>
                  </Td>
                  <Td px={8} py={4} borderBottom="1px solid" borderColor="gray.200">
                    {getStatusBadge(decision.status)}
                  </Td>
                  <Td px={8} py={4} borderBottom="1px solid" borderColor="gray.200">
                    <Text fontSize="xs" color="gray.700">
                      {decision.assignedTo || '—'}
                    </Text>
                  </Td>
                </Tr>
              ))
            )}
          </Tbody>
        </Table>
      </Box>

      {/* Pagination */}
      {filteredDecisions.length > 0 && (
        <Box
          px={8}
          py={3}
          borderTop="1px solid"
          borderColor="gray.200"
          bg="white"
          display="flex"
          justifyContent="center"
          alignItems="center"
        >
          <HStack spacing={4} alignItems="center">
            <HStack spacing={2} alignItems="center">
              <Text fontSize="xs" color="gray.600">
                Show:
              </Text>
              <Menu>
                <MenuButton
                  as={Button}
                  rightIcon={<ChevronDownIcon size={14} />}
                  size="sm"
                  bg="white"
                  border="1px solid"
                  borderColor="gray.300"
                  color="gray.700"
                  fontSize="xs"
                  fontWeight="500"
                  px={3}
                  py={1.5}
                  h="auto"
                  minW="70px"
                  _hover={{
                    bg: 'gray.50',
                    borderColor: 'gray.400',
                  }}
                  _active={{
                    bg: 'gray.50',
                    borderColor: 'gray.400',
                  }}
                  _focus={{
                    boxShadow: 'none',
                    borderColor: 'gray.400',
                  }}
                >
                  {pageSize}
                </MenuButton>
                <MenuList fontSize="xs" minW="70px" py={1}>
                  {[25, 50, 75].map((size) => (
                    <MenuItem
                      key={size}
                      onClick={() => {
                        setPageSize(size);
                        setCurrentPage(1);
                      }}
                      fontSize="xs"
                      bg={pageSize === size ? 'gray.50' : 'white'}
                      _hover={{ bg: 'gray.50' }}
                      _focus={{ bg: 'gray.50' }}
                    >
                      {size}
                    </MenuItem>
                  ))}
                </MenuList>
              </Menu>
            </HStack>

            <Text fontSize="xs" color="gray.600">
              {startIndex + 1}-{Math.min(endIndex, filteredDecisions.length)} of {filteredDecisions.length}
            </Text>

            <HStack spacing={1}>
              <Button
                size="sm"
                bg="white"
                border="1px solid"
                borderColor="gray.300"
                color="gray.700"
                fontSize="xs"
                fontWeight="500"
                px={3}
                py={1.5}
                h="auto"
                isDisabled={currentPage === 1}
                _hover={{
                  bg: currentPage === 1 ? 'white' : 'gray.50',
                  borderColor: currentPage === 1 ? 'gray.300' : 'gray.400',
                }}
                _disabled={{
                  opacity: 0.5,
                  cursor: 'not-allowed',
                }}
                _focus={{
                  boxShadow: 'none',
                  borderColor: 'gray.400',
                }}
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              >
                Previous
              </Button>
              <Button
                size="sm"
                bg="white"
                border="1px solid"
                borderColor="gray.300"
                color="gray.700"
                fontSize="xs"
                fontWeight="500"
                px={3}
                py={1.5}
                h="auto"
                isDisabled={currentPage === totalPages}
                _hover={{
                  bg: currentPage === totalPages ? 'white' : 'gray.50',
                  borderColor: currentPage === totalPages ? 'gray.300' : 'gray.400',
                }}
                _disabled={{
                  opacity: 0.5,
                  cursor: 'not-allowed',
                }}
                _focus={{
                  boxShadow: 'none',
                  borderColor: 'gray.400',
                }}
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              >
                Next
              </Button>
            </HStack>
          </HStack>
        </Box>
      )}
    </Box>
  );
}

