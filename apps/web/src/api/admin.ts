import type {
  AdminStudentItem,
  PendingStudentsResponse,
  AdminMemberActionResponse,
} from '@peerspace/shared';

export interface AdminAllMembersResponse {
  success: true;
  count: number;
  members: Array<AdminStudentItem & { updatedAt?: string }>;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

export class AdminApiError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(status: number, errorPayload: ApiErrorPayload) {
    super(errorPayload.message || 'An unexpected administration error occurred.');
    this.name = 'AdminApiError';
    this.status = status;
    this.code = errorPayload.code;
    this.details = errorPayload.details;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    if (data && data.error) {
      throw new AdminApiError(response.status, data.error);
    }
    throw new AdminApiError(response.status, {
      code: 'HTTP_ERROR',
      message: response.statusText || `Request failed with HTTP status ${response.status}`,
    });
  }

  return data as T;
}

/**
 * Fetch all students awaiting institutional membership approval
 */
export async function fetchPendingStudents(): Promise<PendingStudentsResponse> {
  const response = await fetch('/api/admin/memberships/pending', {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    credentials: 'include',
  });

  return handleResponse<PendingStudentsResponse>(response);
}

/**
 * Fetch all registered users with optional status filter
 */
export async function fetchAllMembers(status?: string): Promise<AdminAllMembersResponse> {
  const url = status
    ? `/api/admin/memberships?status=${encodeURIComponent(status)}`
    : '/api/admin/memberships';

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    credentials: 'include',
  });

  return handleResponse<AdminAllMembersResponse>(response);
}

/**
 * Approve a pending student's membership
 */
export async function approveStudentMembership(id: string): Promise<AdminMemberActionResponse> {
  const response = await fetch(`/api/admin/memberships/${id}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    credentials: 'include',
  });

  return handleResponse<AdminMemberActionResponse>(response);
}

/**
 * Reject a pending student's registration
 */
export async function rejectStudentMembership(
  id: string,
  reason?: string
): Promise<AdminMemberActionResponse> {
  const response = await fetch(`/api/admin/memberships/${id}/reject`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ reason }),
  });

  return handleResponse<AdminMemberActionResponse>(response);
}

/**
 * Suspend an active member account
 */
export async function suspendUserAccount(
  id: string,
  reason?: string
): Promise<AdminMemberActionResponse> {
  const response = await fetch(`/api/admin/memberships/${id}/suspend`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ reason }),
  });

  return handleResponse<AdminMemberActionResponse>(response);
}

/**
 * Reactivate a suspended member account
 */
export async function reactivateUserAccount(id: string): Promise<AdminMemberActionResponse> {
  const response = await fetch(`/api/admin/memberships/${id}/reactivate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    credentials: 'include',
  });

  return handleResponse<AdminMemberActionResponse>(response);
}

/**
 * Permanently delete an eligible suspended user account
 */
export async function permanentlyDeleteUser(id: string): Promise<{
  success: true;
  message: string;
  deletedUser: { id: string; email: string; name: string };
}> {
  const response = await fetch(`/api/admin/memberships/${id}`, {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
    },
    credentials: 'include',
  });

  return handleResponse<{
    success: true;
    message: string;
    deletedUser: { id: string; email: string; name: string };
  }>(response);
}
