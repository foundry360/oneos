'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Box,
  Container,
  Heading,
  FormControl,
  FormLabel,
  Input,
  Button,
  VStack,
  Alert,
  AlertIcon,
  Text,
  Link,
} from '@chakra-ui/react';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isAuthConfigured, setIsAuthConfigured] = useState(true);
  const router = useRouter();
  const { signIn, user, loading: authLoading } = useAuth();
  
  // Only run client-side checks after component mounts
  useEffect(() => {
    setMounted(true);
    const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
    const hasKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    setIsAuthConfigured(hasUrl && hasKey);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn(email, password);
      // Verify we have a valid session before redirecting
      if (result?.user && result?.session) {
        router.push('/control-plane');
        router.refresh(); // Force refresh to update auth state
      } else {
        setError('Login failed. Please try again.');
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign in. Please check your credentials.');
      setLoading(false);
    }
  };

  return (
    <Container maxW="md" centerContent>
      <Box w="100%" p={8} mt={8}>
        <Box mb={6} display="flex" justifyContent="center" alignItems="center">
          <Image
            src="/images/logo.png"
            alt="AI Governance Platform"
            width={200}
            height={60}
            style={{ objectFit: 'contain', width: 'auto', height: 'auto' }}
          />
        </Box>
        
        {mounted && !isAuthConfigured && (
          <Alert status="warning" mb={4} suppressHydrationWarning>
            <AlertIcon />
            <Box>
              <Text fontWeight="bold">Authentication not configured</Text>
              <Text fontSize="sm" mt={2}>
                Please create a <code>.env</code> file in the project root with:
              </Text>
              <Text fontSize="xs" mt={1} fontFamily="mono" bg="gray.100" p={2} borderRadius="md">
                NEXT_PUBLIC_SUPABASE_URL=your-url<br/>
                NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
              </Text>
              <Text fontSize="sm" mt={2}>
                Then restart your Next.js dev server.
              </Text>
            </Box>
          </Alert>
        )}

        {error && (
          <Alert status="error" mb={4}>
            <AlertIcon />
            {error}
          </Alert>
        )}

        <VStack spacing={4}>
          <FormControl>
            <FormLabel>Email</FormLabel>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
            />
          </FormControl>

          <FormControl>
            <FormLabel>Password</FormLabel>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </FormControl>

          <Button
            colorScheme="blue"
            width="100%"
            onClick={handleLogin}
            isLoading={loading}
          >
            Sign In
          </Button>

        </VStack>
      </Box>
    </Container>
  );
}

