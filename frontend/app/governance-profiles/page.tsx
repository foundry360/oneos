'use client';

import { useState } from 'react';
import { Box, Divider, HStack, Text, Button } from '@chakra-ui/react';
import { Plus } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import ProfileList from '@/components/governance-profiles/ProfileList';
import ProfileView from '@/components/governance-profiles/ProfileView';
import ProfileForm from '@/components/governance-profiles/ProfileForm';
import { useGovernanceProfiles, GovernanceProfile } from '@/hooks/useGovernanceProfiles';

type ViewMode = 'list' | 'view' | 'create' | 'edit';

export default function GovernanceProfilesPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedProfile, setSelectedProfile] = useState<GovernanceProfile | null>(null);
  const { fetchProfiles, createProfile, updateProfile } = useGovernanceProfiles();

  const handleSelectProfile = (profile: GovernanceProfile) => {
    setSelectedProfile(profile);
    setViewMode('view');
  };

  const handleCreateNew = () => {
    setSelectedProfile(null);
    setViewMode('create');
  };

  const handleEdit = () => {
    setViewMode('edit');
  };

  const handleSave = async (profileData: Partial<GovernanceProfile>) => {
    if (selectedProfile) {
      await updateProfile(selectedProfile.id, profileData);
    } else {
      await createProfile(profileData);
    }
    setViewMode('list');
    setSelectedProfile(null);
    fetchProfiles();
  };

  const handleClose = () => {
    setViewMode('list');
    setSelectedProfile(null);
  };

  const handleRefresh = () => {
    fetchProfiles();
    if (selectedProfile) {
      // Refresh the selected profile
      // In a real app, you'd fetch the updated profile
    }
  };


  const isModalOpen = viewMode === 'view' || viewMode === 'create' || viewMode === 'edit';
  const modalTitle = viewMode === 'create' 
    ? 'Create New Profile' 
    : viewMode === 'edit' 
    ? 'Edit Profile' 
    : selectedProfile?.name || 'Profile Details';

  return (
    <DashboardLayout>
      {/* Page Heading with Divider - extends full width */}
      <Box 
        position="relative"
        margin="-48px -48px 0 -48px"
        width="calc(100% + 96px)"
        bg="white"
      >
        <Box px={8} py={2}>
          <HStack justify="space-between" alignItems="center">
            <Text 
              fontSize="xl" 
              color="gray.900" 
              fontWeight="600" 
              letterSpacing="-0.01em"
            >
              Governance Profiles
            </Text>
            <Button
              leftIcon={<Plus size={14} />}
              colorScheme="blue"
              size="sm"
              h="28px"
              fontSize="xs"
              onClick={handleCreateNew}
            >
              New Profile
            </Button>
          </HStack>
        </Box>
        <Divider borderColor="gray.300" />
      </Box>

      {/* Two Panels Container */}
      <Box 
        position="relative" 
        height="calc(100vh - 140px)" 
        display="flex"
        margin="0 -48px -48px -48px"
        width="calc(100% + 96px)"
        overflow="hidden"
      >
        {/* Panel 1: Profile List (Left - 70%) */}
        <Box
          width="70%"
          bg="white"
          height="100%"
          display="flex"
          flexDirection="column"
          overflowY="auto"
        >
          <ProfileList
            onSelectProfile={handleSelectProfile}
            selectedProfile={selectedProfile}
          />
        </Box>

        {/* Panel 2: Profile Details (Right - 30%) */}
        <Box
          width="30%"
          bg="white"
          borderLeft="1px solid"
          borderColor="gray.200"
          height="100%"
          display="flex"
          flexDirection="column"
          overflowY="auto"
        >
          {viewMode === 'view' && selectedProfile && (
            <ProfileView
              profile={selectedProfile}
              onClose={handleClose}
              onEdit={handleEdit}
              onRefresh={handleRefresh}
            />
          )}

          {(viewMode === 'create' || viewMode === 'edit') && (
            <ProfileForm
              profile={viewMode === 'edit' ? selectedProfile : null}
              onSave={handleSave}
              onCancel={handleClose}
            />
          )}

          {viewMode === 'list' && !selectedProfile && (
            <Box
              flex="1"
              display="flex"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              px={8}
              py={12}
            >
              <Text fontSize="sm" color="gray.500" textAlign="center" maxW="200px">
                Select a profile to view details
              </Text>
            </Box>
          )}
        </Box>
      </Box>
    </DashboardLayout>
  );
}

