import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
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
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the PeerSpace header, platform title, and login tab by default', async () => {
    // Mock /api/auth/me to return 401 unauthenticated
    vi.spyOn(global, 'fetch').mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/api/auth/me')) {
        return Promise.resolve(new Response(null, { status: 401 }));
      }
      return Promise.resolve(new Response(JSON.stringify({ status: 'ok' }), { status: 200 }));
    });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    );

    // Platform header
    expect(screen.getByText('Student Feedback Management System')).toBeInTheDocument();

    // Default to sign in form
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Sign in to your account/i })).toBeInTheDocument();
    });
    expect(screen.getByLabelText(/University Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password/i)).toBeInTheDocument();
  });

  it('allows switching to student registration tab and back', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(() =>
      Promise.resolve(new Response(null, { status: 401 }))
    );

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Student Registration/i })).toBeInTheDocument();
    });

    // Switch to Registration
    fireEvent.click(screen.getByRole('tab', { name: /Student Registration/i }));

    expect(screen.getByRole('heading', { name: /Create student account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Confirm Password/i)).toBeInTheDocument();

    // Switch back to Login
    fireEvent.click(screen.getByRole('tab', { name: /Sign In/i }));
    expect(screen.getByRole('heading', { name: /Sign in to your account/i })).toBeInTheDocument();
  });

  it('opens and closes the system diagnostics health modal', async () => {
    vi.spyOn(global, 'fetch').mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/api/health')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              status: 'ok',
              service: 'PeerSpace API',
              version: '0.1.0',
              environment: 'test',
              uptime: 100,
              timestamp: new Date().toISOString(),
              database: {
                status: 'connected',
                name: 'peerspace_feedback',
                host: '127.0.0.1:27017',
                latencyMs: 1,
              },
              memory: { rssMb: 50, heapUsedMb: 20, heapTotalMb: 30 },
            }),
            { status: 200 }
          )
        );
      }
      return Promise.resolve(new Response(null, { status: 401 }));
    });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    );

    const diagnosticsButton = screen.getByRole('button', {
      name: /View system health diagnostics/i,
    });
    fireEvent.click(diagnosticsButton);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/PeerSpace Diagnostics Monitor/i)).toBeInTheDocument();

    // Close modal
    const closeButton = screen.getByRole('button', { name: /Close diagnostics dialog/i });
    fireEvent.click(closeButton);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
