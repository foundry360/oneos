'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Button,
  Select,
  Input,
  HStack,
  Badge,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  FormControl,
  FormLabel,
  VStack,
  Spinner,
  IconButton,
  Text,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Divider,
} from '@chakra-ui/react';
import { useUsers } from '@/hooks/useUsers';
import DashboardLayout from '@/components/DashboardLayout';
import { Plus, Search, Edit2, Trash2, MoreVertical, ChevronDown as ChevronDownIcon } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';

export default function UsersPage() {
  const { user } = useAuth();
  const { users, loading, error, createUser, updateUser, deleteUser, fetchUsers } = useUsers();
  const { profile } = useProfile(user?.id);
  const toast = useToast();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form state
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    role: 'user' as const,
    displayName: ''
  });
  const [editRole, setEditRole] = useState<string>('');

  const isAdmin = profile?.role === 'admin';

  // Auto-filter when role or search changes (debounce search)
  useEffect(() => {
    if (!isAdmin) return; // Don't fetch if not admin
    const timeoutId = setTimeout(() => {
      fetchUsers({ role: roleFilter || undefined, search: searchQuery || undefined });
    }, searchQuery ? 300 : 0); // Debounce search input, but filter role immediately

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFilter, searchQuery, isAdmin]);

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <Box p={8}>
          <Heading size="md" color="red.600">Access Denied</Heading>
          <Text mt={4}>Only administrators can access user management.</Text>
        </Box>
      </DashboardLayout>
    );
  }

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.password) {
      toast({ title: 'Email and password are required', status: 'warning' });
      return;
    }
    
    try {
      await createUser(newUser);
      toast({ title: 'User created successfully', status: 'success' });
      setIsCreateModalOpen(false);
      setNewUser({ email: '', password: '', role: 'user', displayName: '' });
    } catch (error: any) {
      toast({ title: 'Failed to create user', description: error.message, status: 'error' });
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      await updateUser(userId, { role: newRole });
      toast({ title: 'User role updated', status: 'success' });
      setIsEditModalOpen(false);
    } catch (error: any) {
      toast({ title: 'Failed to update role', description: error.message, status: 'error' });
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`Are you sure you want to deactivate ${email}?`)) return;
    
    try {
      await deleteUser(userId);
      toast({ title: 'User deactivated', status: 'success' });
    } catch (error: any) {
      toast({ title: 'Failed to deactivate user', description: error.message, status: 'error' });
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'red';
      case 'governance': return 'purple';
      case 'reviewer': return 'blue';
      case 'user': return 'gray';
      default: return 'gray';
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesRole = !roleFilter || user.role === roleFilter;
    const matchesSearch = !searchQuery || 
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.display_name && user.display_name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesRole && matchesSearch;
  });

  return (
    <DashboardLayout>
      <Box p={8}>
        <HStack justify="space-between" mb={6}>
          <Heading size="lg" color="gray.800" fontWeight="600">User Management</Heading>
          <Button
            leftIcon={<Plus size={14} />}
            colorScheme="blue"
            size="sm"
            h="30px"
            fontSize="xs"
            onClick={() => setIsCreateModalOpen(true)}
          >
            Create User
          </Button>
        </HStack>

        {/* Filters */}
        <HStack mb={6} spacing={4}>
          <Input
            placeholder="Search by email or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            maxW="300px"
            size="sm"
            bg="white"
            border="1px solid"
            borderColor="gray.300"
            borderRadius="md"
            fontSize="xs"
            h="32px"
            _hover={{
              border: '1px solid',
              borderColor: 'gray.400',
            }}
            _focus={{
              border: '1px solid !important',
              borderColor: 'gray.400 !important',
              boxShadow: 'none !important',
            }}
          />
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
              {roleFilter 
                ? roleFilter.charAt(0).toUpperCase() + roleFilter.slice(1)
                : 'Filter by role'}
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
                onClick={() => {
                  setRoleFilter('');
                }}
                fontSize="xs"
                bg={!roleFilter ? 'gray.50' : 'white'}
                _hover={{ bg: 'gray.50' }}
                _focus={{ bg: 'gray.50' }}
                border="none"
              >
                <Text>All Roles</Text>
              </MenuItem>
              <Divider borderColor="gray.200" m={0} />
              <MenuItem
                onClick={() => {
                  setRoleFilter('admin');
                }}
                fontSize="xs"
                bg={roleFilter === 'admin' ? 'gray.50' : 'white'}
                _hover={{ bg: 'gray.50' }}
                _focus={{ bg: 'gray.50' }}
                border="none"
              >
                <Text>Admin</Text>
              </MenuItem>
              <Divider borderColor="gray.200" m={0} />
              <MenuItem
                onClick={() => {
                  setRoleFilter('governance');
                }}
                fontSize="xs"
                bg={roleFilter === 'governance' ? 'gray.50' : 'white'}
                _hover={{ bg: 'gray.50' }}
                _focus={{ bg: 'gray.50' }}
                border="none"
              >
                <Text>Governance</Text>
              </MenuItem>
              <Divider borderColor="gray.200" m={0} />
              <MenuItem
                onClick={() => {
                  setRoleFilter('reviewer');
                }}
                fontSize="xs"
                bg={roleFilter === 'reviewer' ? 'gray.50' : 'white'}
                _hover={{ bg: 'gray.50' }}
                _focus={{ bg: 'gray.50' }}
                border="none"
              >
                <Text>Reviewer</Text>
              </MenuItem>
              <Divider borderColor="gray.200" m={0} />
              <MenuItem
                onClick={() => {
                  setRoleFilter('user');
                }}
                fontSize="xs"
                bg={roleFilter === 'user' ? 'gray.50' : 'white'}
                _hover={{ bg: 'gray.50' }}
                _focus={{ bg: 'gray.50' }}
                border="none"
              >
                <Text>User</Text>
              </MenuItem>
            </MenuList>
          </Menu>
        </HStack>

        {/* Error Display */}
        {error && (
          <Box bg="red.50" border="1px" borderColor="red.200" borderRadius="md" p={4} mb={6}>
            <Text color="red.600" fontWeight="medium">Error: {error}</Text>
            <Text fontSize="sm" color="red.500" mt={2}>
              Please check the browser console for more details.
            </Text>
          </Box>
        )}

        {/* Users Table */}
        {loading ? (
          <Box textAlign="center" py={12}>
            <Spinner size="xl" />
          </Box>
        ) : (
          <Box bg="white" borderRadius="md" overflow="hidden" border="1px" borderColor="gray.200" boxShadow="sm">
            <Table variant="simple" size="sm">
              <Thead bg="gray.50">
                <Tr>
                  <Th color="gray.600" fontWeight="600" fontSize="xs" textTransform="uppercase">Email</Th>
                  <Th color="gray.600" fontWeight="600" fontSize="xs" textTransform="uppercase">Display Name</Th>
                  <Th color="gray.600" fontWeight="600" fontSize="xs" textTransform="uppercase">Role</Th>
                  <Th color="gray.600" fontWeight="600" fontSize="xs" textTransform="uppercase">Created</Th>
                  <Th color="gray.600" fontWeight="600" fontSize="xs" textTransform="uppercase">Last Login</Th>
                  <Th color="gray.600" fontWeight="600" fontSize="xs" textTransform="uppercase">Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {filteredUsers.length === 0 ? (
                  <Tr>
                    <Td colSpan={6} textAlign="center" py={8} color="gray.500">
                      No users found
                    </Td>
                  </Tr>
                ) : (
                  filteredUsers.map((user) => (
                    <Tr key={user.id}>
                      <Td>{user.email}</Td>
                      <Td>{user.display_name || '-'}</Td>
                      <Td>
                        <Badge colorScheme={getRoleColor(user.role)}>
                          {user.role}
                        </Badge>
                      </Td>
                      <Td>{new Date(user.user_created_at).toLocaleDateString()}</Td>
                      <Td>{user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}</Td>
                      <Td>
                        <Menu>
                          <MenuButton
                            as={IconButton}
                            aria-label="User actions"
                            icon={<MoreVertical size={16} />}
                            size="sm"
                            variant="ghost"
                            _hover={{ bg: 'gray.100' }}
                            _active={{ bg: 'gray.200' }}
                          />
                          <MenuList
                            bg="white"
                            border="1px solid"
                            borderColor="gray.300"
                            boxShadow="sm"
                            py={0}
                            minW="160px"
                            borderRadius="md"
                          >
                            <MenuItem
                              icon={<Edit2 size={16} />}
                              fontSize="xs"
                              _hover={{ bg: 'gray.50' }}
                              _focus={{ bg: 'gray.50' }}
                              border="none"
                              onClick={() => {
                                setSelectedUser(user);
                                setEditRole(user.role);
                                setIsEditModalOpen(true);
                              }}
                            >
                              Edit Role
                            </MenuItem>
                            <Divider borderColor="gray.200" m={0} />
                            <MenuItem
                              icon={<Trash2 size={16} />}
                              color="red.600"
                              fontSize="xs"
                              _hover={{ bg: 'gray.50' }}
                              _focus={{ bg: 'gray.50' }}
                              border="none"
                              onClick={() => handleDeleteUser(user.id, user.email)}
                              isDisabled={user.id === profile?.id}
                            >
                              Delete User
                            </MenuItem>
                          </MenuList>
                        </Menu>
                      </Td>
                    </Tr>
                  ))
                )}
              </Tbody>
            </Table>
          </Box>
        )}

        {/* Create User Modal */}
        <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)}>
          <ModalOverlay />
          <ModalContent borderRadius="3xl">
            <ModalHeader>Create New User</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Email</FormLabel>
                  <Input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="user@example.com"
                  />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Password</FormLabel>
                  <Input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="Enter password"
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Role</FormLabel>
                  <Select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value as any })}
                  >
                    <option value="user">User</option>
                    <option value="reviewer">Reviewer</option>
                    <option value="governance">Governance</option>
                    <option value="admin">Admin</option>
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel>Display Name (Optional)</FormLabel>
                  <Input
                    value={newUser.displayName}
                    onChange={(e) => setNewUser({ ...newUser, displayName: e.target.value })}
                    placeholder="John Doe"
                  />
                </FormControl>
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={() => setIsCreateModalOpen(false)} h="30px" fontSize="xs">
                Cancel
              </Button>
              <Button colorScheme="blue" onClick={handleCreateUser} h="30px" fontSize="xs">
                Create User
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Edit Role Modal */}
        <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)}>
          <ModalOverlay />
          <ModalContent borderRadius="3xl">
            <ModalHeader>Update User Role</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <FormControl>
                <FormLabel>Role</FormLabel>
                <Select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                >
                  <option value="user">User</option>
                  <option value="reviewer">Reviewer</option>
                  <option value="governance">Governance</option>
                  <option value="admin">Admin</option>
                </Select>
              </FormControl>
              {selectedUser && (
                <Text fontSize="sm" color="gray.600" mt={4}>
                  Updating role for: {selectedUser.email}
                </Text>
              )}
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={() => setIsEditModalOpen(false)} h="30px" fontSize="xs">
                Cancel
              </Button>
              <Button
                colorScheme="blue"
                onClick={() => selectedUser && handleUpdateRole(selectedUser.id, editRole)}
                h="30px"
                fontSize="xs"
              >
                Update Role
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </Box>
    </DashboardLayout>
  );
}

