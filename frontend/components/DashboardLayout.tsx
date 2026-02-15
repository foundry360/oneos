'use client';

import { ReactNode, useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useRouter, usePathname } from 'next/navigation';
import {
  Box,
  Flex,
  HStack,
  VStack,
  Avatar,
  Text,
  Spinner,
  Container,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Button,
  useDisclosure,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  Divider,
  FormControl,
  FormLabel,
  Switch,
  Select,
  Heading,
  Input,
  useToast,
} from '@chakra-ui/react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect } from 'react';
import { PanelLeftClose, PanelRightOpen, Settings, Fullscreen, Minimize2, LayoutDashboard, FileText, ClipboardCheck, ShieldCheck, Blocks } from 'lucide-react';

type SidebarMode = 'expanded' | 'collapsed' | 'hover';

interface DashboardLayoutProps {
  children: ReactNode;
}

const SIDEBAR_MODE_KEY = 'sidebar-mode';

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, loading: authLoading, signOut } = useAuth();
  const { profile, loading: profileLoading, updateProfile, uploadAvatar } = useProfile(user?.id);
  const router = useRouter();
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(SIDEBAR_MODE_KEY);
      if (saved === 'expanded' || saved === 'collapsed' || saved === 'hover') {
        return saved;
      }
    }
    return 'expanded';
  });
  const [isHovered, setIsHovered] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const { 
    isOpen: isSettingsOpen, 
    onOpen: onSettingsOpen, 
    onClose: onSettingsClose 
  } = useDisclosure(); // Settings drawer

  // Update display name when profile loads
  useEffect(() => {
    if (profile?.display_name) {
      setDisplayName(profile.display_name);
    }
  }, [profile]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Persist sidebar mode to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(SIDEBAR_MODE_KEY, sidebarMode);
    }
  }, [sidebarMode]);

  const handleSidebarModeChange = (mode: SidebarMode) => {
    setSidebarMode(mode);
  };

  // Determine if sidebar should be collapsed based on mode and hover state
  const isCollapsed = sidebarMode === 'collapsed' || (sidebarMode === 'hover' && !isHovered);

  const toggleFullscreen = (e: React.MouseEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.blur();
    }
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.error('Error attempting to enable fullscreen:', err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch((err) => {
        console.error('Error attempting to exit fullscreen:', err);
      });
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const handleSignOut = async (e?: React.MouseEvent) => {
    if (e && e.currentTarget instanceof HTMLElement) {
      e.currentTarget.blur();
    }
    await signOut();
    router.push('/login');
    onSettingsClose();
  };

  const handleSaveDisplayName = async () => {
    try {
      await updateProfile({ display_name: displayName });
      toast({
        title: 'Display name updated',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    } catch (error: any) {
      console.error('Save display name error:', error);
      toast({
        title: 'Failed to update display name',
        description: error?.message || 'Please check your permissions',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload an image smaller than 5MB',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setUploadingAvatar(true);
    try {
      await uploadAvatar(file);
      toast({
        title: 'Avatar updated',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    } catch (error: any) {
      console.error('Avatar upload error:', error);
      toast({
        title: 'Failed to upload avatar',
        description: error?.message || 'Please check storage permissions',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (authLoading || !user) {
    return (
      <Container centerContent>
        <Spinner size="xl" mt={8} />
      </Container>
    );
  }

  return (
    <Flex h="100vh" direction="column" bg="#fefefe">
      {/* Header */}
      <Box
        as="header"
        w="100%"
        h="64px"
        bg="white"
        borderBottom="1px solid"
        borderColor="gray.200"
        px={6}
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        position="sticky"
        top={0}
        zIndex={100}
      >
        {/* Logo */}
        <Box>
          <Image
            src="/images/logo.png"
            alt="OneOS"
            width={120}
            height={36}
            style={{ objectFit: 'contain' }}
          />
        </Box>

        {/* User Profile & Settings */}
        <HStack spacing={0} gap={0}>
          <IconButton
            aria-label="Toggle Fullscreen"
            icon={isFullscreen ? <Minimize2 size={20} style={{ filter: 'none' }} /> : <Fullscreen size={20} style={{ filter: 'none' }} />}
            size="md"
            variant="ghost"
            color="gray.600"
            border="none"
            _hover={{ bg: 'gray.100', color: 'blue.600', border: 'none' }}
            _focus={{ outline: 'none', boxShadow: 'none', ring: 'none', ringOffset: 'none', border: 'none' }}
            _focusVisible={{ outline: 'none', boxShadow: 'none', ring: 'none', ringOffset: 'none', border: 'none' }}
            _active={{ outline: 'none', boxShadow: 'none', ring: 'none', ringOffset: 'none', border: 'none' }}
            transition="all 0.2s"
            onClick={toggleFullscreen}
            onMouseDown={(e) => {
              e.preventDefault();
              e.currentTarget.blur();
            }}
            onBlur={(e) => {
              e.currentTarget.blur();
            }}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          />
          <IconButton
            aria-label="Open Settings"
            icon={<Settings size={20} style={{ filter: 'none' }} />}
            size="md"
            variant="ghost"
            color="gray.600"
            border="none"
            _hover={{ bg: 'gray.100', color: 'blue.600', border: 'none' }}
            _focus={{ outline: 'none', boxShadow: 'none', ring: 'none', ringOffset: 'none', border: 'none' }}
            _focusVisible={{ outline: 'none', boxShadow: 'none', ring: 'none', ringOffset: 'none', border: 'none' }}
            _active={{ outline: 'none', boxShadow: 'none', ring: 'none', ringOffset: 'none', border: 'none' }}
            transition="all 0.2s"
            onClick={onSettingsOpen}
            onMouseDown={(e) => {
              e.preventDefault();
              e.currentTarget.blur();
            }}
            onBlur={(e) => {
              e.currentTarget.blur();
            }}
            title="Settings"
          />
          <VStack spacing={0} align="flex-end" ml={3} mr={2}>
            <Text fontSize="sm" fontWeight="medium" color="gray.700">
              {profile?.display_name || user.email || 'User'}
            </Text>
            <Text fontSize="xs" color="gray.500">
              {profile?.role 
                ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1)
                : 'Administrator'}
            </Text>
          </VStack>
          <Avatar
            size="sm"
            src={profile?.avatar_url || undefined}
            name={profile?.display_name || user.email || 'User'}
            bg="blue.500"
            color="white"
          />
        </HStack>
      </Box>

      {/* Main Content Area */}
      <Flex flex={1} overflow="hidden">
        {/* Sidebar */}
        <Box
          as="aside"
          w={isCollapsed ? '64px' : '240px'}
          bg="gray.50"
          borderRight="1px solid"
          borderColor="gray.200"
          py={6}
          transition="width 0.2s ease"
          position="relative"
          display="flex"
          flexDirection="column"
          onMouseEnter={() => sidebarMode === 'hover' && setIsHovered(true)}
          onMouseLeave={() => sidebarMode === 'hover' && setIsHovered(false)}
        >
          <VStack spacing={1} align="stretch" px={isCollapsed ? 2 : 4} flex={1}>
            <NavLink href="/control-plane" isCollapsed={isCollapsed} icon={<LayoutDashboard size={20} />}>
              Control Plane
            </NavLink>
            <NavLink href="/governance-profiles" isCollapsed={isCollapsed} icon={<ShieldCheck size={20} />}>
              Governance Profiles
            </NavLink>
            <NavLink href="/files" isCollapsed={isCollapsed} icon={<FileText size={20} />}>
              Files
            </NavLink>
            <NavLink href="/reviews" isCollapsed={isCollapsed} icon={<ClipboardCheck size={20} />}>
              Review Tasks
            </NavLink>
            <NavLink href="/blockchain" isCollapsed={isCollapsed} icon={<Blocks size={20} />}>
              Blockchain
            </NavLink>
            <Box mt="auto" pt={4} borderTop="1px solid" borderColor="gray.200">
              <Box 
                px={isCollapsed ? 0 : 4} 
                pt={isCollapsed ? 2 : 0}
                display="flex"
                justifyContent={isCollapsed ? 'center' : 'flex-end'}
              >
                <Menu>
                  <MenuButton
                    as={IconButton}
                    aria-label="Sidebar options"
                    icon={isCollapsed ? <PanelRightOpen size={20} style={{ filter: 'none' }} /> : <PanelLeftClose size={20} style={{ filter: 'none' }} />}
                    onMouseDown={(e) => e.preventDefault()}
                    size="sm"
                    variant="ghost"
                    color="gray.400"
                    _hover={{ bg: 'gray.100', color: 'gray.500' }}
                    _focus={{ outline: 'none', boxShadow: 'none', ring: 'none', ringOffset: 'none' }}
                    _focusVisible={{ outline: 'none', boxShadow: 'none', ring: 'none', ringOffset: 'none' }}
                    _active={{ outline: 'none', boxShadow: 'none', ring: 'none', ringOffset: 'none' }}
                  />
                  <MenuList
                    className="sidebar-toggle-menu"
                    minW="200px"
                    py={1}
                    px={0}
                    border="1px solid"
                    borderColor="gray.200"
                    borderRadius="md"
                    boxShadow="none"
                    bg="white"
                    _focus={{ boxShadow: 'none', outline: 'none' }}
                    _hover={{ boxShadow: 'none' }}
                  >
                    <MenuItem
                      onClick={() => handleSidebarModeChange('expanded')}
                      _focus={{ bg: 'gray.50' }}
                      _hover={{ bg: 'gray.50' }}
                      borderRadius={0}
                    >
                      <HStack spacing={2} w="100%">
                        <Box
                          w="8px"
                          h="8px"
                          borderRadius="full"
                          bg={sidebarMode === 'expanded' ? 'blue.500' : 'transparent'}
                          flexShrink={0}
                        />
                        <Text fontSize="xs">Expanded</Text>
                      </HStack>
                    </MenuItem>
                    <Divider m={0} borderColor="gray.100" />
                    <MenuItem
                      onClick={() => handleSidebarModeChange('collapsed')}
                      _focus={{ bg: 'gray.50' }}
                      _hover={{ bg: 'gray.50' }}
                      borderRadius={0}
                    >
                      <HStack spacing={2} w="100%">
                        <Box
                          w="8px"
                          h="8px"
                          borderRadius="full"
                          bg={sidebarMode === 'collapsed' ? 'blue.500' : 'transparent'}
                          flexShrink={0}
                        />
                        <Text fontSize="xs">Collapsed</Text>
                      </HStack>
                    </MenuItem>
                    <Divider m={0} borderColor="gray.100" />
                    <MenuItem
                      onClick={() => handleSidebarModeChange('hover')}
                      _focus={{ bg: 'gray.50' }}
                      _hover={{ bg: 'gray.50' }}
                      borderRadius={0}
                    >
                      <HStack spacing={2} w="100%">
                        <Box
                          w="8px"
                          h="8px"
                          borderRadius="full"
                          bg={sidebarMode === 'hover' ? 'blue.500' : 'transparent'}
                          flexShrink={0}
                        />
                        <Text fontSize="xs">Hover</Text>
                      </HStack>
                    </MenuItem>
                  </MenuList>
                </Menu>
              </Box>
            </Box>
          </VStack>
        </Box>

        {/* Page Content */}
        <Box flex={1} overflowY="auto" bg="#fefefe" p={8}>
          <Box bg="white" borderRadius="md" boxShadow="sm" p={6}>
            {children}
          </Box>
        </Box>
      </Flex>

      {/* Settings Drawer - Slides from right */}
      <Drawer
        isOpen={isSettingsOpen}
        placement="right"
        onClose={onSettingsClose}
        size="md"
      >
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton _focus={{ outline: 'none', boxShadow: 'none', ring: 'none', ringOffset: 'none' }} _focusVisible={{ outline: 'none', boxShadow: 'none', ring: 'none', ringOffset: 'none' }} _active={{ outline: 'none', boxShadow: 'none', ring: 'none', ringOffset: 'none' }} />
          <DrawerHeader borderBottomWidth="1px">
            <Heading size="md">Settings</Heading>
          </DrawerHeader>

          <DrawerBody p={6}>
            <VStack spacing={6} align="stretch">
              {/* Profile Section */}
              <Box bg="white" p={4} borderRadius="md" boxShadow="sm">
                <Heading size="sm" mb={4} color="gray.700">
                  Profile
                </Heading>
                <VStack spacing={4} align="stretch">
                  {/* Avatar Upload */}
                  <Box>
                    <FormLabel fontSize="sm" color="gray.600" mb={2}>
                      Avatar
                    </FormLabel>
                    <HStack spacing={4}>
                      <Avatar
                        size="lg"
                        src={profile?.avatar_url || undefined}
                        name={profile?.display_name || user.email || 'User'}
                        bg="blue.500"
                        color="white"
                      />
                      <VStack align="flex-start" spacing={2} flex={1}>
                        <Input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarUpload}
                          display="none"
                          id="avatar-upload"
                        />
                        <Button
                          as="label"
                          htmlFor="avatar-upload"
                          size="sm"
                          variant="outline"
                          isLoading={uploadingAvatar}
                          cursor="pointer"
                          _focus={{ outline: 'none', boxShadow: 'none', ring: 'none', ringOffset: 'none' }}
                          _focusVisible={{ outline: 'none', boxShadow: 'none', ring: 'none', ringOffset: 'none' }}
                          _active={{ outline: 'none', boxShadow: 'none', ring: 'none', ringOffset: 'none' }}
                          onMouseDown={(e) => e.preventDefault()}
                        >
                          {uploadingAvatar ? 'Uploading...' : 'Upload Avatar'}
                        </Button>
                        <Text fontSize="xs" color="gray.500">
                          JPG, PNG or GIF. Max 5MB
                        </Text>
                      </VStack>
                    </HStack>
                  </Box>

                  {/* Display Name */}
                  <Box>
                    <FormLabel fontSize="sm" color="gray.600" mb={2}>
                      Display Name
                    </FormLabel>
                    <HStack spacing={2}>
                      <Input
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Enter your display name"
                        size="sm"
                      />
                      <Button
                        size="sm"
                        colorScheme="blue"
                        onClick={handleSaveDisplayName}
                        isDisabled={!displayName || displayName === profile?.display_name}
                        _focus={{ outline: 'none', boxShadow: 'none', ring: 'none', ringOffset: 'none' }}
                        _focusVisible={{ outline: 'none', boxShadow: 'none', ring: 'none', ringOffset: 'none' }}
                        _active={{ outline: 'none', boxShadow: 'none', ring: 'none', ringOffset: 'none' }}
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        Save
                      </Button>
                    </HStack>
                  </Box>

                  {/* Email (read-only) */}
                  <Box>
                    <Text fontSize="sm" color="gray.600" mb={1}>
                      Email
                    </Text>
                    <Text fontSize="md" fontWeight="medium" color="gray.800">
                      {user.email || 'Not available'}
                    </Text>
                  </Box>

                  {/* User ID (read-only) */}
                  <Box>
                    <Text fontSize="sm" color="gray.600" mb={1}>
                      User ID
                    </Text>
                    <Text fontSize="xs" color="gray.500" fontFamily="mono">
                      {user.id || 'Not available'}
                    </Text>
                  </Box>
                </VStack>
              </Box>

              <Divider />

              {/* Preferences Section */}
              <Box bg="white" p={4} borderRadius="md" boxShadow="sm">
                <Heading size="sm" mb={4} color="gray.700">
                  Preferences
                </Heading>
                <VStack spacing={4} align="stretch">
                  <FormControl display="flex" alignItems="center" justifyContent="space-between">
                    <FormLabel htmlFor="notifications" mb={0} fontSize="sm">
                      Email Notifications
                    </FormLabel>
                    <Switch id="notifications" colorScheme="blue" />
                  </FormControl>
                  <FormControl display="flex" alignItems="center" justifyContent="space-between">
                    <FormLabel htmlFor="dark-mode" mb={0} fontSize="sm">
                      Dark Mode
                    </FormLabel>
                    <Switch id="dark-mode" colorScheme="blue" />
                  </FormControl>
                  <FormControl>
                    <FormLabel htmlFor="language" fontSize="sm">
                      Language
                    </FormLabel>
                    <Select id="language" size="sm">
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                    </Select>
                  </FormControl>
                </VStack>
              </Box>

              <Divider />

              {/* System Section */}
              <Box bg="white" p={4} borderRadius="md" boxShadow="sm">
                <Heading size="sm" mb={4} color="gray.700">
                  System
                </Heading>
                <VStack spacing={4} align="stretch">
                  <Box>
                    <Text fontSize="sm" color="gray.600" mb={1}>
                      Version
                    </Text>
                    <Text fontSize="sm" color="gray.800">
                      1.0.0
                    </Text>
                  </Box>
                  <Button
                    size="sm"
                    variant="outline"
                    colorScheme="blue"
                    _focus={{ outline: 'none', boxShadow: 'none', ring: 'none', ringOffset: 'none' }}
                    _focusVisible={{ outline: 'none', boxShadow: 'none', ring: 'none', ringOffset: 'none' }}
                    _active={{ outline: 'none', boxShadow: 'none', ring: 'none', ringOffset: 'none' }}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      // Refresh page
                      window.location.reload();
                    }}
                  >
                    Refresh Application
                  </Button>
                </VStack>
              </Box>

              <Divider />

              {/* Account Actions */}
              <Box bg="white" p={4} borderRadius="md" boxShadow="sm">
                <Heading size="sm" mb={4} color="gray.700">
                  Account
                </Heading>
                <VStack spacing={2} align="stretch">
                  <Button
                    size="sm"
                    variant="outline"
                    colorScheme="red"
                    _focus={{ outline: 'none', boxShadow: 'none', ring: 'none', ringOffset: 'none' }}
                    _focusVisible={{ outline: 'none', boxShadow: 'none', ring: 'none', ringOffset: 'none' }}
                    _active={{ outline: 'none', boxShadow: 'none', ring: 'none', ringOffset: 'none' }}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={(e) => handleSignOut(e)}
                  >
                    Sign Out
                  </Button>
                </VStack>
              </Box>
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Flex>
  );
}

interface NavLinkProps {
  href: string;
  children: ReactNode;
  onClick?: () => void;
  isSignOut?: boolean;
  isCollapsed?: boolean;
  icon?: ReactNode;
}

function NavLink({ href, children, onClick, isSignOut, isCollapsed, icon }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href;

  if (isCollapsed) {
    return (
      <Link href={href} onClick={onClick}>
        <Box
          px={2}
          py={2}
          borderRadius={0}
          bg={isActive && !isSignOut ? 'white' : 'transparent'}
          borderLeft={isActive && !isSignOut ? '3px solid' : '3px solid transparent'}
          borderColor={isActive && !isSignOut ? 'blue.500' : 'transparent'}
          _hover={{ bg: isActive ? 'white' : 'gray.100' }}
          _focus={{ outline: 'none', boxShadow: 'none', ring: 'none', ringOffset: 'none' }}
          _focusVisible={{ outline: 'none', boxShadow: 'none', ring: 'none', ringOffset: 'none' }}
          _active={{ outline: 'none', boxShadow: 'none', ring: 'none', ringOffset: 'none' }}
          transition="all 0.2s"
          cursor="pointer"
          display="flex"
          justifyContent="center"
          alignItems="center"
          title={String(children)}
        >
          {icon ? (
            <Box
              color={isActive && !isSignOut ? 'gray.600' : 'gray.700'}
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              {icon}
            </Box>
          ) : (
            <Text
              fontSize="xs"
              color={isActive && !isSignOut ? 'gray.700' : 'gray.700'}
              fontWeight={isActive && !isSignOut ? '600' : 'medium'}
              noOfLines={1}
              textAlign="center"
            >
              {String(children).charAt(0)}
            </Text>
          )}
        </Box>
      </Link>
    );
  }

  return (
    <Link href={href} onClick={onClick}>
      <Box
        px={4}
        py={2}
        borderRadius={0}
        bg={isActive && !isSignOut ? 'white' : 'transparent'}
        borderLeft={isActive && !isSignOut ? '3px solid' : '3px solid transparent'}
        borderColor={isActive && !isSignOut ? 'blue.500' : 'transparent'}
        _hover={{ bg: isActive ? 'white' : 'gray.100' }}
        _focus={{ outline: 'none', boxShadow: 'none', ring: 'none', ringOffset: 'none' }}
        _focusVisible={{ outline: 'none', boxShadow: 'none', ring: 'none', ringOffset: 'none' }}
        _active={{ outline: 'none', boxShadow: 'none', ring: 'none', ringOffset: 'none' }}
        transition="all 0.2s"
        cursor="pointer"
        display="flex"
        alignItems="center"
        gap={3}
      >
        {icon && (
          <Box
            color={isActive && !isSignOut ? 'gray.600' : 'gray.600'}
            display="flex"
            alignItems="center"
          >
            {icon}
          </Box>
        )}
        <Text
          fontSize="sm"
          color={isActive && !isSignOut ? 'gray.700' : 'gray.700'}
          fontWeight={isActive && !isSignOut ? '600' : 'medium'}
        >
          {children}
        </Text>
      </Box>
    </Link>
  );
}

