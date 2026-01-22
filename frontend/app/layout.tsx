'use client';

import { ChakraProvider } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { useState } from 'react';
import theme from '../theme';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  }));

  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <QueryClientProvider client={queryClient}>
          <ChakraProvider theme={theme}>
            {children}
          </ChakraProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}

