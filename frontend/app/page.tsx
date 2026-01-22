'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Box, Spinner, Center } from '@chakra-ui/react';

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.push('/control-plane');
      } else {
        router.push('/login');
      }
    }
  }, [user, loading, router]);

  return (
    <Center h="100vh">
      <Spinner size="xl" />
    </Center>
  );
}

