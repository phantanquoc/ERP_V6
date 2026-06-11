import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * Creates a fresh QueryClient for each test to prevent cache bleed-over.
 * Retries disabled so tests fail fast instead of waiting on retry backoff.
 */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
}

/**
 * Render a component wrapped in QueryClientProvider.
 * Pass a custom queryClient to pre-seed cache or share across assertions.
 */
export function renderWithProviders(
  ui: React.ReactElement,
  { queryClient, ...options }: RenderWithProvidersOptions = {}
) {
  const client = queryClient ?? createTestQueryClient();

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        {children}
      </QueryClientProvider>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...options }),
    queryClient: client,
  };
}
