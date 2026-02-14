'use client';

import { useState, useEffect, useRef } from 'react';
import { Box, Divider, HStack, Text, Button, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton, useDisclosure } from '@chakra-ui/react';
import { Plus } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import ProfileList from '@/components/governance-profiles/ProfileList';
import ProfileView from '@/components/governance-profiles/ProfileView';
import ProfileForm from '@/components/governance-profiles/ProfileForm';
import { useGovernanceProfiles, GovernanceProfile } from '@/hooks/useGovernanceProfiles';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';

type ViewMode = 'list' | 'view' | 'create' | 'edit';

export default function GovernanceProfilesPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedProfile, setSelectedProfile] = useState<GovernanceProfile | null>(null);
  const [isHighlightsPanelCollapsed, setIsHighlightsPanelCollapsed] = useState(false);
  const { profiles, fetchProfiles, createProfile, updateProfile, fetchProfile } = useGovernanceProfiles();
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  const isAdmin = profile?.role === 'admin';
  const isGovernance = profile?.role === 'governance';
  const canCreateVersion = isAdmin || isGovernance;
  const { isOpen: isCreateModalOpen, onOpen: onCreateModalOpen, onClose: onCreateModalClose } = useDisclosure();
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const profileFormSaveRef = useRef<{ save: () => Promise<void> } | null>(null);

  // Update selected profile when profiles list changes (e.g., after activation)
  useEffect(() => {
    if (selectedProfile) {
      const updatedProfile = profiles.find(p => p.id === selectedProfile.id);
      if (updatedProfile && updatedProfile.status !== selectedProfile.status) {
        setSelectedProfile(updatedProfile);
      }
    }
  }, [profiles, selectedProfile]);

  // Automatically select the most recent profile on initial load
  useEffect(() => {
    if (profiles.length > 0 && !selectedProfile && viewMode === 'list') {
      // Find the most recent profile by created_at (or updated_at if created_at is the same)
      const mostRecent = profiles.reduce((latest, current) => {
        const latestDate = new Date(latest.created_at).getTime();
        const currentDate = new Date(current.created_at).getTime();
        
        if (currentDate > latestDate) {
          return current;
        } else if (currentDate === latestDate) {
          // If created_at is the same, compare updated_at
          const latestUpdated = new Date(latest.updated_at || latest.created_at).getTime();
          const currentUpdated = new Date(current.updated_at || current.created_at).getTime();
          return currentUpdated > latestUpdated ? current : latest;
        }
        return latest;
      });
      
      setSelectedProfile(mostRecent);
      setViewMode('view');
    }
  }, [profiles, selectedProfile, viewMode]);

  const handleSelectProfile = (profile: GovernanceProfile) => {
    setSelectedProfile(profile);
    setViewMode('view');
  };

  const handleCreateNew = () => {
    setSelectedProfile(null);
    onCreateModalOpen();
  };

  const handleEdit = () => {
    setViewMode('edit');
  };

  const handleCreateNewVersion = async (newProfileId: string) => {
    // Fetch the new profile and set it as selected, then switch to edit mode
    const newProfile = await fetchProfile(newProfileId);
    if (newProfile) {
      setSelectedProfile(newProfile);
      setViewMode('edit');
    }
  };

  const handleSave = async (profileData: Partial<GovernanceProfile>) => {
    if (selectedProfile) {
      const updatedProfile = await updateProfile(selectedProfile.id, profileData);
      // Update selected profile if it's still the same one
      if (selectedProfile.id === updatedProfile.id) {
        setSelectedProfile(updatedProfile);
      }
      // Refresh the full list to ensure we have the latest data
      await fetchProfiles();
      setViewMode('list');
      setSelectedProfile(null);
    } else {
      // Creating new profile from modal
      await createProfile(profileData);
      // Refresh the full list to ensure we have the latest data
      await fetchProfiles();
      onCreateModalClose();
    }
  };

  const handleClose = () => {
    setViewMode('list');
    setSelectedProfile(null);
  };

  const handleRefresh = async () => {
    await fetchProfiles();
    if (selectedProfile) {
      // Refresh the selected profile to get latest data
      const refreshedProfile = await fetchProfile(selectedProfile.id);
      if (refreshedProfile) {
        setSelectedProfile(refreshedProfile);
      }
    }
  };



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
              h="30px"
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
          width={isHighlightsPanelCollapsed ? "calc(100% - 64px)" : "70%"}
          bg="white"
          height="100%"
          display="flex"
          flexDirection="column"
          overflowY="auto"
          transition="width 0.2s ease"
        >
          <ProfileList
            onSelectProfile={handleSelectProfile}
            selectedProfile={selectedProfile}
          />
        </Box>

        {/* Panel 2: Profile Details (Right - 30%) */}
        <Box
          width={isHighlightsPanelCollapsed ? "64px" : "30%"}
          bg="white"
          borderLeft="1px solid"
          borderColor="gray.200"
          height="100%"
          display="flex"
          flexDirection="column"
          overflowY="auto"
          transition="width 0.2s ease"
        >
          {viewMode === 'view' && selectedProfile && (
            <ProfileView
              profile={selectedProfile}
              onClose={handleClose}
              onEdit={handleEdit}
              onRefresh={handleRefresh}
              isAdmin={canCreateVersion}
              onCreateNewVersion={handleCreateNewVersion}
              onCollapseChange={setIsHighlightsPanelCollapsed}
            />
          )}

          {viewMode === 'edit' && (
            <ProfileForm
              profile={selectedProfile}
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

      {/* Create New Profile Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={onCreateModalClose} scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent borderRadius="3xl" maxH="80vh" w="92vw" maxW="1000px" display="flex" flexDirection="column" overflow="hidden">
          <ModalHeader px={6} pt={8} pb={0}>
            <Box pl={5}>
              <Text fontSize="xl" fontWeight="600" mb={1}>Create New Profile</Text>
              <Text fontSize="sm" color="gray.600" fontWeight="normal">
                Create a governance profile to define risk thresholds, review requirements, and assignment rules for this use case.
              </Text>
            </Box>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody px={6} pt={5} pb={6} flex="1" overflowY="auto" minH={0}>
            <ProfileForm
              ref={profileFormSaveRef}
              profile={null}
              onSave={handleSave}
              onCancel={onCreateModalClose}
              isModal={true}
              showButtons={false}
            />
          </ModalBody>
          <ModalFooter 
            borderTop="1px solid" 
            borderColor="gray.200" 
            position="sticky" 
            bottom={0} 
            bg="white" 
            zIndex={10}
            py={3}
            borderBottomRadius="3xl"
          >
            <Button variant="ghost" onClick={onCreateModalClose} h="30px" fontSize="xs" mr={3}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={async () => {
                if (profileFormSaveRef.current) {
                  setIsSavingProfile(true);
                  try {
                    await profileFormSaveRef.current.save();
                  } finally {
                    setIsSavingProfile(false);
                  }
                }
              }}
              isLoading={isSavingProfile}
              h="30px"
              fontSize="xs"
            >
              Save
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </DashboardLayout>
  );
}

