import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminDashboard } from '../src/components/AdminDashboard';
import { RejectedNotice } from '../src/components/RejectedNotice';
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

const mockAdminUser: UserResponse = {
  id: 'admin_123',
  name: 'Dr. Jane Administrator',
  email: 'admin@university.edu',
  role: UserRole.ADMIN,
  status: UserStatus.ACTIVE,
  createdAt: '2026-09-01T10:00:00.000Z',
  updatedAt: '2026-09-01T10:00:00.000Z',
};

const mockStudentUser: UserResponse = {
  id: 'student_999',
  name: 'Alice Student',
  email: 'alice@university.edu',
  role: UserRole.STUDENT,
  status: UserStatus.ACTIVE,
  createdAt: '2026-09-10T10:00:00.000Z',
  updatedAt: '2026-09-10T10:00:00.000Z',
};

const mockPendingStudents = [
  {
    id: 'student_1',
    name: 'Bob Pending',
    email: 'bob@university.edu',
    role: UserRole.STUDENT,
    status: UserStatus.PENDING,
    createdAt: new Date('2026-10-15T08:30:00.000Z').toISOString(),
  },
  {
    id: 'student_2',
    name: 'Charlie Review',
    email: 'charlie@university.edu',
    role: UserRole.STUDENT,
    status: UserStatus.PENDING,
    createdAt: new Date('2026-10-16T09:45:00.000Z').toISOString(),
  },
];

const mockAllMembers = [
  {
    id: 'admin_123',
    name: 'Dr. Jane Administrator',
    email: 'admin@university.edu',
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
    createdAt: new Date('2026-09-01T10:00:00.000Z').toISOString(),
  },
  {
    id: 'student_1',
    name: 'Bob Pending',
    email: 'bob@university.edu',
    role: UserRole.STUDENT,
    status: UserStatus.PENDING,
    createdAt: new Date('2026-10-15T08:30:00.000Z').toISOString(),
  },
  {
    id: 'user_suspended',
    name: 'David Suspended',
    email: 'david@university.edu',
    role: UserRole.STUDENT,
    status: UserStatus.SUSPENDED,
    createdAt: new Date('2026-09-12T12:00:00.000Z').toISOString(),
  },
];

describe('Administrator Dashboard & Membership Views (Stage 4)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('restricts access when user role is not admin', () => {
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <AdminDashboard user={mockStudentUser} />
      </QueryClientProvider>
    );

    expect(screen.getByText('Access Restricted')).toBeInTheDocument();
    expect(
      screen.getByText(/requires verified system administrator privileges/i)
    ).toBeInTheDocument();
  });

  it('renders administrator dashboard with pending students list and count', async () => {
    vi.spyOn(global, 'fetch').mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/api/admin/memberships/pending')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              count: mockPendingStudents.length,
              students: mockPendingStudents,
            }),
            { status: 200 }
          )
        );
      }
      if (url.includes('/api/admin/memberships')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              count: mockAllMembers.length,
              members: mockAllMembers,
            }),
            { status: 200 }
          )
        );
      }
      return Promise.resolve(new Response(JSON.stringify({ status: 'ok' }), { status: 200 }));
    });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <AdminDashboard user={mockAdminUser} />
      </QueryClientProvider>
    );

    expect(
      screen.getByRole('heading', { name: /Institutional Membership & Access Control/i })
    ).toBeInTheDocument();
    expect(screen.getByText('Dr. Jane Administrator')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Bob Pending')).toBeInTheDocument();
      expect(screen.getByText('bob@university.edu')).toBeInTheDocument();
      expect(screen.getByText('Charlie Review')).toBeInTheDocument();
    });
  });

  it('approves a pending student when Approve button is clicked', async () => {
    let approveCalled = false;
    vi.spyOn(global, 'fetch').mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/api/admin/memberships/student_1/approve')) {
        approveCalled = true;
        expect(init?.method).toBe('POST');
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              message: 'Student account approved successfully.',
              user: {
                id: 'student_1',
                name: 'Bob Pending',
                email: 'bob@university.edu',
                role: UserRole.STUDENT,
                status: UserStatus.ACTIVE,
                createdAt: new Date().toISOString(),
              },
            }),
            { status: 200 }
          )
        );
      }
      if (url.includes('/api/admin/memberships/pending')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              count: mockPendingStudents.length,
              students: mockPendingStudents,
            }),
            { status: 200 }
          )
        );
      }
      if (url.includes('/api/admin/memberships')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              count: mockAllMembers.length,
              members: mockAllMembers,
            }),
            { status: 200 }
          )
        );
      }
      return Promise.resolve(new Response(JSON.stringify({ status: 'ok' }), { status: 200 }));
    });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <AdminDashboard user={mockAdminUser} />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Approve Bob Pending/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Approve Bob Pending/i }));

    await waitFor(() => {
      expect(approveCalled).toBe(true);
      expect(
        screen.getByText(/Successfully approved student membership for "Bob Pending"/i)
      ).toBeInTheDocument();
    });
  });

  it('declines a student registration with optional reason', async () => {
    let rejectPayload: string | undefined;
    vi.spyOn(global, 'fetch').mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/api/admin/memberships/student_2/reject')) {
        rejectPayload = init?.body as string;
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              message: 'Student registration rejected.',
              user: {
                id: 'student_2',
                name: 'Charlie Review',
                email: 'charlie@university.edu',
                role: UserRole.STUDENT,
                status: UserStatus.REJECTED,
                createdAt: new Date().toISOString(),
              },
            }),
            { status: 200 }
          )
        );
      }
      if (url.includes('/api/admin/memberships/pending')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              count: mockPendingStudents.length,
              students: mockPendingStudents,
            }),
            { status: 200 }
          )
        );
      }
      if (url.includes('/api/admin/memberships')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              count: mockAllMembers.length,
              members: mockAllMembers,
            }),
            { status: 200 }
          )
        );
      }
      return Promise.resolve(new Response(JSON.stringify({ status: 'ok' }), { status: 200 }));
    });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <AdminDashboard user={mockAdminUser} />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Decline Charlie Review/i })).toBeInTheDocument();
    });

    // Open decline modal
    fireEvent.click(screen.getByRole('button', { name: /Decline Charlie Review/i }));

    expect(screen.getByRole('heading', { name: /Decline Registration/i })).toBeInTheDocument();

    const reasonInput = screen.getByLabelText(/Reason for declining/i);
    fireEvent.change(reasonInput, { target: { value: 'Not enrolled in current semester roster' } });

    fireEvent.click(screen.getByRole('button', { name: /Confirm Decline/i }));

    await waitFor(() => {
      expect(rejectPayload).toContain('Not enrolled in current semester roster');
      expect(
        screen.getByText(/Student registration for "Charlie Review" declined/i)
      ).toBeInTheDocument();
    });
  });

  it('switches to institutional roster tab and prevents self-suspension', async () => {
    vi.spyOn(global, 'fetch').mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/api/admin/memberships/pending')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              count: mockPendingStudents.length,
              students: mockPendingStudents,
            }),
            { status: 200 }
          )
        );
      }
      if (url.includes('/api/admin/memberships')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              count: mockAllMembers.length,
              members: mockAllMembers,
            }),
            { status: 200 }
          )
        );
      }
      return Promise.resolve(new Response(JSON.stringify({ status: 'ok' }), { status: 200 }));
    });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <AdminDashboard user={mockAdminUser} />
      </QueryClientProvider>
    );

    // Click tab to switch to roster
    fireEvent.click(screen.getByRole('button', { name: /Institutional Account Roster/i }));

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /Institutional Account Directory/i })
      ).toBeInTheDocument();
      expect(screen.getByText('David Suspended')).toBeInTheDocument();
    });

    // Verify self "You" badge and that admin cannot suspend own account
    expect(screen.getByText('You')).toBeInTheDocument();
    const selfSuspendButton = screen.getByRole('button', {
      name: `Suspend ${mockAdminUser.name}`,
    });
    expect(selfSuspendButton).toBeDisabled();
  });

  it('renders RejectedNotice for declined applicants with sign out button', () => {
    const rejectedUser: UserResponse = {
      id: 'rejected_1',
      name: 'Frank Rejected',
      email: 'frank@university.edu',
      role: UserRole.STUDENT,
      status: UserStatus.REJECTED,
      createdAt: '2026-10-18T12:00:00.000Z',
      updatedAt: '2026-10-18T12:00:00.000Z',
    };

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <RejectedNotice user={rejectedUser} />
      </QueryClientProvider>
    );

    expect(screen.getByText('Registration Declined')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /Membership Application Declined/i })
    ).toBeInTheDocument();
    expect(screen.getByText('Frank Rejected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign Out/i })).toBeInTheDocument();
  });
});
