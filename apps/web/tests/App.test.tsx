import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from '../src/App';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

describe('App Component', () => {
  it('renders the PeerSpace header and platform title', () => {
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    );

    expect(
      screen.getByRole('heading', {
        name: /PeerSpace — Student Feedback & Growth Platform/i,
      })
    ).toBeInTheDocument();
    expect(screen.getByText(/Production-Minded Monorepo Architecture/i)).toBeInTheDocument();
    expect(screen.getByText(/System Diagnostics & Health/i)).toBeInTheDocument();
  });
});
