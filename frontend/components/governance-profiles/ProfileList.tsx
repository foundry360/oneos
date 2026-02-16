'use client';

import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Input,
  Spinner,
  Alert,
  AlertIcon,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Divider,
} from '@chakra-ui/react';
import { Search, ChevronDown as ChevronDownIcon } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { useGovernanceProfiles, GovernanceProfile } from '@/hooks/useGovernanceProfiles';

interface ProfileListProps {
  onSelectProfile?: (profile: GovernanceProfile) => void;
  selectedProfile?: GovernanceProfile | null;
  isHighlightsPanelCollapsed?: boolean;
}

export default function ProfileList({ onSelectProfile, selectedProfile, isHighlightsPanelCollapsed = false }: ProfileListProps) {
  const { profiles, loading, error, fetchProfiles } = useGovernanceProfiles();
  const [domainFilter, setDomainFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  const handleProfileClick = (profile: GovernanceProfile) => {
    // Only call the onSelectProfile callback to update the sidebar view
    // Do NOT navigate to full-page view - that's only done via the scan-eye icon in ProfileView
    if (onSelectProfile) {
      onSelectProfile(profile);
    }
  };

  const filteredProfiles = useMemo(() => {
    return profiles.filter((profile) => {
      if (domainFilter && profile.domain !== domainFilter) return false;
      if (statusFilter && profile.status !== statusFilter) return false;
      if (searchQuery && !profile.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !profile.description?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [profiles, domainFilter, statusFilter, searchQuery]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [domainFilter, statusFilter, searchQuery]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredProfiles.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedProfiles = filteredProfiles.slice(startIndex, endIndex);

  const getStatusBadge = (status: string) => {
    let dotColor: string;
    let statusText: string;
    
    switch (status?.toLowerCase()) {
      case 'active':
        dotColor = '#16A34A';
        statusText = 'Active';
        break;
      case 'draft':
        dotColor = '#FFAA33';
        statusText = 'Draft';
        break;
      case 'archived':
        dotColor = '#6B7280';
        statusText = 'Archived';
        break;
      case 'deprecated':
        // Handle legacy deprecated status - treat as archived
        dotColor = '#6B7280';
        statusText = 'Archived';
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
        bg="transparent"
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
        <Text color="gray.700" textTransform="none">{statusText}</Text>
      </Badge>
    );
  };

  const domains = Array.from(new Set(profiles.map(p => p.domain)));

  // Helper function to format relative time
  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const capitalizeFirst = (str: string) => {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  if (loading) {
    return (
      <Box p={4}>
        <Spinner size="lg" />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert status="error">
        <AlertIcon />
        {error}
      </Alert>
    );
  }

  return (
    <Box height="100%" display="flex" flexDirection="column">
      {/* Filters Section */}
      <Box
        px={8}
        py={3}
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
                bg="transparent"
                border="none"
                _hover={{ bg: 'transparent', border: 'none' }}
                _focus={{ bg: 'transparent', border: 'none', boxShadow: 'none', outline: 'none' }}
                _active={{ bg: 'transparent', border: 'none' }}
              >
                <Search size={14} style={{ filter: 'none' }} />
              </Box>
              <Input
                placeholder="Search profiles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
                aria-label="Search profiles"
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
                {domainFilter || 'All Domains'}
              </MenuButton>
              <MenuList
                bg="white"
                border="1px solid"
                borderColor="gray.300"
                boxShadow="sm"
                py={0}
                minW="160px"
              >
                <MenuItem
                  onClick={() => setDomainFilter('')}
                  fontSize="xs"
                  bg={!domainFilter ? 'gray.50' : 'white'}
                  _hover={{ bg: 'gray.50' }}
                  _focus={{ bg: 'gray.50' }}
                  border="none"
                >
                  <Text>All Domains</Text>
                </MenuItem>
                {domains.length > 0 && <Divider borderColor="gray.200" />}
                {domains.map((domain, index) => (
                  <Box key={domain}>
                    {index > 0 && <Divider borderColor="gray.200" />}
                    <MenuItem
                      onClick={() => setDomainFilter(domain)}
                      fontSize="xs"
                      bg={domainFilter === domain ? 'gray.50' : 'white'}
                      _hover={{ bg: 'gray.50' }}
                      _focus={{ bg: 'gray.50' }}
                      border="none"
                    >
                      <Text>{domain.toUpperCase()}</Text>
                    </MenuItem>
                  </Box>
                ))}
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
                {statusFilter 
                  ? statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)
                  : 'All Status'}
              </MenuButton>
              <MenuList
                bg="white"
                border="1px solid"
                borderColor="gray.300"
                boxShadow="sm"
                py={0}
                minW="140px"
              >
                <MenuItem
                  onClick={() => setStatusFilter('')}
                  fontSize="xs"
                  bg={!statusFilter ? 'gray.50' : 'white'}
                  _hover={{ bg: 'gray.50' }}
                  _focus={{ bg: 'gray.50' }}
                  border="none"
                >
                  <Text>All Status</Text>
                </MenuItem>
                <Divider borderColor="gray.200" />
                <MenuItem
                  onClick={() => setStatusFilter('draft')}
                  fontSize="xs"
                  bg={statusFilter === 'draft' ? 'gray.50' : 'white'}
                  _hover={{ bg: 'gray.50' }}
                  _focus={{ bg: 'gray.50' }}
                  border="none"
                >
                  <Text>Draft</Text>
                </MenuItem>
                <Divider borderColor="gray.200" />
                <MenuItem
                  onClick={() => setStatusFilter('active')}
                  fontSize="xs"
                  bg={statusFilter === 'active' ? 'gray.50' : 'white'}
                  _hover={{ bg: 'gray.50' }}
                  _focus={{ bg: 'gray.50' }}
                  border="none"
                >
                  <Text>Active</Text>
                </MenuItem>
                <Divider borderColor="gray.200" />
                <MenuItem
                  onClick={() => setStatusFilter('archived')}
                  fontSize="xs"
                  bg={statusFilter === 'archived' ? 'gray.50' : 'white'}
                  _hover={{ bg: 'gray.50' }}
                  _focus={{ bg: 'gray.50' }}
                  border="none"
                >
                  <Text>Archived</Text>
                </MenuItem>
              </MenuList>
            </Menu>
          </HStack>
      </Box>

       {/* Table Section */}
       <Box flex="1" overflowY="auto" className="scrollbar-hover">
         <Table variant="simple" width="100%">
           <Thead>
             <Tr>
               <Th px={8} py={4} minW="200px">Profile Name</Th>
               <Th px={8} py={4} whiteSpace="nowrap">Domain</Th>
               <Th px={8} py={4} w="120px">Status</Th>
               <Th px={8} py={4} w="80px">Version</Th>
               {isHighlightsPanelCollapsed && (
                 <>
                   <Th px={8} py={4} whiteSpace="nowrap">Human Review</Th>
                   <Th px={8} py={4} whiteSpace="nowrap">Created</Th>
                 </>
               )}
             </Tr>
           </Thead>
           <Tbody>
             {paginatedProfiles.length === 0 ? (
               <Tr>
                 <Td colSpan={isHighlightsPanelCollapsed ? 6 : 4} px={8} textAlign="center" py={8}>
                   <Text color="gray.500">No profiles found</Text>
                 </Td>
               </Tr>
             ) : (
               paginatedProfiles.map((profile) => (
                 <Tr 
                   key={profile.id} 
                   onClick={() => handleProfileClick(profile)}
                   cursor="pointer"
                   _hover={{ bg: 'gray.100' }}
                   bg={
                     selectedProfile?.id === profile.id
                       ? 'gray.50'
                       : 'white'
                   }
                   borderLeft={
                     selectedProfile?.id === profile.id ? '3px solid' : '3px solid transparent'
                   }
                   borderLeftColor={selectedProfile?.id === profile.id ? 'blue.500' : 'transparent'}
                   transition="all 0.1s"
                   aria-selected={selectedProfile?.id === profile.id}
                   role="row"
                 >
                   <Td px={8} py={4}>
                     <VStack align="start" spacing={0}>
                       <Text fontSize="sm" fontWeight="medium" noOfLines={1}>{profile.name}</Text>
                       {profile.description && (
                         <Text fontSize="xs" color="gray.600" noOfLines={1}>
                           {profile.description}
                         </Text>
                       )}
                     </VStack>
                   </Td>
                   <Td px={8} py={4} whiteSpace="nowrap">
                     <Text
                       as="span"
                       display="inline-block"
                       px={2}
                       py={0.5}
                       borderRadius="md"
                       bg="blue.50"
                       color="blue.800"
                       fontSize="11px"
                       fontWeight="500"
                       textTransform="uppercase"
                       whiteSpace="nowrap"
                     >
                       {profile.domain}
                     </Text>
                   </Td>
                   <Td px={8} py={4}>
                     {getStatusBadge(profile.status)}
                   </Td>
                   <Td px={8} py={4}>
                     <Text fontSize="xs">{profile.version}</Text>
                   </Td>
                   {isHighlightsPanelCollapsed && (
                     <>
                       <Td px={8} py={4} whiteSpace="nowrap">
                         <Badge
                           fontSize="xs"
                           bg="blue.50"
                           color="blue.800"
                           fontWeight="normal"
                           textTransform="none"
                           px={2}
                           py={0.5}
                         >
                           {capitalizeFirst(profile.human_review_requirement)}
                         </Badge>
                       </Td>
                       <Td px={8} py={4} whiteSpace="nowrap">
                         <Text fontSize="xs" color="gray.600">
                           {formatRelativeTime(profile.created_at)}
                         </Text>
                       </Td>
                     </>
                   )}
                 </Tr>
               ))
             )}
           </Tbody>
         </Table>
       </Box>

      {/* Pagination */}
      {filteredProfiles.length > 0 && (
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
                <MenuList fontSize="xs" minW="70px" py={0}>
                  {[25, 50, 75].map((size, index) => (
                    <Box key={size}>
                      {index > 0 && <Divider borderColor="gray.200" />}
                      <MenuItem
                        onClick={() => {
                          setPageSize(size);
                          setCurrentPage(1);
                        }}
                        fontSize="xs"
                        bg={pageSize === size ? 'gray.50' : 'white'}
                        _hover={{ bg: 'gray.50' }}
                        _focus={{ bg: 'gray.50' }}
                        border="none"
                      >
                        {size}
                      </MenuItem>
                    </Box>
                  ))}
                </MenuList>
              </Menu>
            </HStack>

            <Text fontSize="xs" color="gray.600">
              {startIndex + 1}-{Math.min(endIndex, filteredProfiles.length)} of {filteredProfiles.length}
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

