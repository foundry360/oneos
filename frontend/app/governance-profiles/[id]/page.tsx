'use client';

import { useParams, useRouter } from 'next/navigation';
import { Box, Text, Spinner } from '@chakra-ui/react';
import DashboardLayout from '@/components/DashboardLayout';
import FullProfileView from '@/components/governance-profiles/FullProfileView';

export default function GovernanceProfilePage() {
  const params = useParams();
  const router = useRouter();
  
  // Get the profile ID from the route params
  const profileId = params?.id as string | undefined;
  
  console.log('GovernanceProfilePage rendered with params:', params);
  console.log('Profile ID:', profileId);

  const handleBack = () => {
    router.push('/governance-profiles');
  };

  if (!profileId) {
    return (
      <DashboardLayout>
        <Box p={8} textAlign="center">
          <Spinner size="lg" />
          <Text mt={4} color="gray.500">Loading profile...</Text>
        </Box>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <FullProfileView profileId={profileId} onBack={handleBack} />
    </DashboardLayout>
  );
}

