'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  FormControl,
  FormLabel,
  Input,
  Button,
  VStack,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import { useAuth } from '@/hooks/useAuth';
import Image from 'next/image';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { signIn } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn(email, password);
      if (result?.user && result?.session) {
        router.push('/control-plane');
        router.refresh();
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
            priority
          />
        </Box>

        {error && (
          <Alert status="error" mb={4}>
            <AlertIcon />
            {error}
          </Alert>
        )}

        <Box as="form" onSubmit={handleLogin}>
          <VStack spacing={4}>
            <FormControl>
              <FormLabel>Email</FormLabel>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
              />
            </FormControl>

            <FormControl>
              <FormLabel>Password</FormLabel>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </FormControl>

            <Button
              type="submit"
              colorScheme="blue"
              width="100%"
              isLoading={loading}
            >
              Sign In
            </Button>
          </VStack>
        </Box>
      </Box>
    </Container>
  );
}

