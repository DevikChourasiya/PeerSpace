import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LoginForm } from '../src/components/LoginForm';
import { RegisterForm } from '../src/components/RegisterForm';
import { PendingApproval } from '../src/components/PendingApproval';
import { ActivePortal } from '../src/components/ActivePortal';
import { SuspendedNotice } from '../src/components/SuspendedNotice';
import { UserRole, UserStatus, type UserResponse } from '@peerspace/shared';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

describe('Frontend Authentication & Membership Views (Stage 3)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. LoginForm Component', () => {
    it('toggles password visibility when show/hide button is clicked', () => {
      const queryClient = createTestQueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          <LoginForm onSwitchToRegister={vi.fn()} />
        </QueryClientProvider>
      );

      const passwordInput = screen.getByLabelText(/^Password/i) as HTMLInputElement;
      expect(passwordInput.type).toBe('password');

      const toggleButton = screen.getByLabelText('Show password');
      fireEvent.click(toggleButton);

      expect(passwordInput.type).toBe('text');
      expect(screen.getByLabelText('Hide password')).toBeInTheDocument();
    });

    it('displays client-side validation errors for invalid email', async () => {
      const queryClient = createTestQueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          <LoginForm onSwitchToRegister={vi.fn()} />
        </QueryClientProvider>
      );

      const emailInput = screen.getByLabelText(/University Email Address/i);
      fireEvent.change(emailInput, { target: { value: 'not-an-email' } });

      const submitButton = screen.getByRole('button', { name: /Sign in to PeerSpace/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Please provide a valid email address/i)).toBeInTheDocument();
      });
    });

    it('submits login request with credentials and handles API failure response', async () => {
      vi.spyOn(global, 'fetch').mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              success: false,
              error: {
                code: 'INVALID_CREDENTIALS',
                message: 'Invalid email or password.',
              },
            }),
            { status: 401 }
          )
        )
      );

      const queryClient = createTestQueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          <LoginForm onSwitchToRegister={vi.fn()} />
        </QueryClientProvider>
      );

      fireEvent.change(screen.getByLabelText(/University Email Address/i), {
        target: { value: 'student@university.edu' },
      });
      fireEvent.change(screen.getByLabelText(/^Password/i), {
        target: { value: 'WrongPassword123!' },
      });

      fireEvent.click(screen.getByRole('button', { name: /Sign in to PeerSpace/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText('Invalid email or password.')).toBeInTheDocument();
      });
    });
  });

  describe('2. RegisterForm Component', () => {
    it('displays validation error when password confirmation does not match', async () => {
      const queryClient = createTestQueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          <RegisterForm onSwitchToLogin={vi.fn()} />
        </QueryClientProvider>
      );

      fireEvent.change(screen.getByLabelText(/Full Name/i), {
        target: { value: 'Sarah Connor' },
      });
      fireEvent.change(screen.getByLabelText(/University Email Address/i), {
        target: { value: 'sarah@university.edu' },
      });
      fireEvent.change(screen.getByLabelText(/^Password/i), {
        target: { value: 'Password123!' },
      });
      fireEvent.change(screen.getByLabelText(/Confirm Password/i), {
        target: { value: 'MismatchPassword123!' },
      });

      fireEvent.click(screen.getByRole('button', { name: /Submit Registration/i }));

      await waitFor(() => {
        expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument();
      });
    });

    it('displays duplicate email conflict message from API response', async () => {
      vi.spyOn(global, 'fetch').mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              success: false,
              error: {
                code: 'EMAIL_ALREADY_EXISTS',
                message: 'An account with this email address already exists.',
              },
            }),
            { status: 409 }
          )
        )
      );

      const queryClient = createTestQueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          <RegisterForm onSwitchToLogin={vi.fn()} />
        </QueryClientProvider>
      );

      fireEvent.change(screen.getByLabelText(/Full Name/i), {
        target: { value: 'Sarah Connor' },
      });
      fireEvent.change(screen.getByLabelText(/University Email Address/i), {
        target: { value: 'existing@university.edu' },
      });
      fireEvent.change(screen.getByLabelText(/^Password/i), {
        target: { value: 'ValidPassword123!' },
      });
      fireEvent.change(screen.getByLabelText(/Confirm Password/i), {
        target: { value: 'ValidPassword123!' },
      });

      fireEvent.click(screen.getByRole('button', { name: /Submit Registration/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(
          screen.getByText('An account with this email address already exists.')
        ).toBeInTheDocument();
      });
    });
  });

  describe('3. Membership Status Views', () => {
    const mockPendingUser: UserResponse = {
      id: 'usr_pend_123',
      name: 'Morgan Blake',
      email: 'morgan.student@university.edu',
      role: UserRole.STUDENT,
      status: UserStatus.PENDING,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const mockActiveUser: UserResponse = {
      id: 'usr_act_456',
      name: 'Taylor Swift',
      email: 'taylor.student@university.edu',
      role: UserRole.STUDENT,
      status: UserStatus.ACTIVE,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const mockSuspendedUser: UserResponse = {
      id: 'usr_susp_789',
      name: 'Chris Dane',
      email: 'chris.student@university.edu',
      role: UserRole.STUDENT,
      status: UserStatus.SUSPENDED,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    it('renders PendingApproval view with user details and status indicator', () => {
      const queryClient = createTestQueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          <PendingApproval user={mockPendingUser} />
        </QueryClientProvider>
      );

      expect(
        screen.getByRole('heading', { name: /Awaiting Instructor or Admin Approval/i })
      ).toBeInTheDocument();
      expect(screen.getByText(/Membership Status: Pending Verification/i)).toBeInTheDocument();
      expect(screen.getAllByText('Morgan Blake').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('morgan.student@university.edu')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /(Check Approval Status|Checking Status)/i })
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Sign Out/i })).toBeInTheDocument();
    });

    it('renders ActivePortal view with active badge and peer review modules', () => {
      const queryClient = createTestQueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          <ActivePortal user={mockActiveUser} />
        </QueryClientProvider>
      );

      expect(
        screen.getByRole('heading', { name: /Welcome back, Taylor Swift!/i })
      ).toBeInTheDocument();
      expect(screen.getByText(/Approved & Active Member/i)).toBeInTheDocument();
      expect(screen.getByText(/Course Feedback Cycles/i)).toBeInTheDocument();
      expect(screen.getByText(/Anonymous Peer Reviews/i)).toBeInTheDocument();
      expect(screen.getByText(/Growth & Analytics/i)).toBeInTheDocument();
    });

    it('renders SuspendedNotice view with clear account suspension warning', () => {
      const queryClient = createTestQueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          <SuspendedNotice user={mockSuspendedUser} />
        </QueryClientProvider>
      );

      expect(
        screen.getByRole('heading', { name: /Access to PeerSpace Suspended/i })
      ).toBeInTheDocument();
      expect(screen.getByText(/Account Suspended/i)).toBeInTheDocument();
      expect(screen.getByText(/Chris Dane/i)).toBeInTheDocument();
    });

    it('triggers logout request when Sign Out button is clicked', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation((input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input.toString();
        if (url.includes('/api/auth/logout')) {
          return Promise.resolve(
            new Response(JSON.stringify({ success: true, message: 'Logged out' }), { status: 200 })
          );
        }
        return Promise.resolve(new Response(null, { status: 401 }));
      });

      const queryClient = createTestQueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          <PendingApproval user={mockPendingUser} />
        </QueryClientProvider>
      );

      const signOutButton = screen.getByRole('button', { name: /Sign Out/i });
      fireEvent.click(signOutButton);

      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledWith(
          '/api/auth/logout',
          expect.objectContaining({ method: 'POST', credentials: 'include' })
        );
      });
    });
  });
});
