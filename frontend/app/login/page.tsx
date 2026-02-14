import dynamic from 'next/dynamic';
import { Spinner, Center, Container } from '@chakra-ui/react';

// Disable SSR for the entire login form
const LoginForm = dynamic(() => import('./LoginForm'), {
  ssr: false,
  loading: () => (
    <Container maxW="md" centerContent>
      <Center h="100vh">
        <Spinner size="xl" />
      </Center>
    </Container>
  ),
});

export default function LoginPage() {
  return <LoginForm />;
}
