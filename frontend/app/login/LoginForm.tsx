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
    <Box
      minH="100vh"
      position="relative"
      overflow="hidden"
      bg="blue.50"
      bgGradient="linear(to-br, blue.50, blue.100, blue.50)"
    >
      {/* Wavy background SVG */}
      <Box
        position="absolute"
        top={0}
        left={0}
        right={0}
        bottom={0}
        zIndex={0}
      >
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 1200 800"
          preserveAspectRatio="none"
          style={{ display: 'block' }}
        >
          <path
            d="M0,200 Q300,100 600,200 T1200,200 L1200,800 L0,800 Z"
            fill="#93C5FD"
            opacity="0.6"
          />
          <path
            d="M0,400 Q400,300 800,400 T1200,400 L1200,800 L0,800 Z"
            fill="#60A5FA"
            opacity="0.5"
          />
          <path
            d="M0,600 Q200,500 400,600 T800,600 T1200,600 L1200,800 L0,800 Z"
            fill="#93C5FD"
            opacity="0.4"
          />
        </svg>
      </Box>

      {/* Animated floating shapes */}
      <Box
        position="absolute"
        top="10%"
        left="10%"
        w="200px"
        h="200px"
        borderRadius="full"
        bg="blue.200"
        opacity={0.15}
        filter="blur(40px)"
        zIndex={0}
        className="float-animation"
        style={{ animationDuration: '6s' }}
      />
      <Box
        position="absolute"
        top="60%"
        right="15%"
        w="150px"
        h="150px"
        borderRadius="full"
        bg="blue.300"
        opacity={0.15}
        filter="blur(40px)"
        zIndex={0}
        className="float-animation"
        style={{ animationDuration: '8s', animationDelay: '2s' }}
      />
      <Box
        position="absolute"
        bottom="20%"
        left="20%"
        w="180px"
        h="180px"
        borderRadius="full"
        bg="blue.300"
        opacity={0.15}
        filter="blur(40px)"
        zIndex={0}
        className="float-animation"
        style={{ animationDuration: '7s', animationDelay: '4s' }}
      />

      <Container 
        maxW="md" 
        centerContent 
        minH="100vh" 
        display="flex" 
        alignItems="center" 
        justifyContent="center"
        position="relative"
        zIndex={1}
      >
        <Box 
          w="100%" 
          p={8}
          bg="white"
          borderRadius="md"
          border="1px solid"
          borderColor="gray.200"
          boxShadow="xl"
          backdropFilter="blur(10px)"
        >
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
    </Box>
  );
}





