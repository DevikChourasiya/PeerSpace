import type { LoginRequest, RegisterRequest, UserResponse } from '@peerspace/shared';

export interface AuthSuccessResponse {
  success: true;
  message?: string;
  user: UserResponse;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

export class AuthApiError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(status: number, errorPayload: ApiErrorPayload) {
    super(errorPayload.message || 'An unexpected authentication error occurred.');
    this.name = 'AuthApiError';
    this.status = status;
    this.code = errorPayload.code;
    this.details = errorPayload.details;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    if (data && data.error) {
      throw new AuthApiError(response.status, data.error);
    }
    throw new AuthApiError(response.status, {
      code: 'HTTP_ERROR',
      message: response.statusText || `Request failed with HTTP status ${response.status}`,
    });
  }

  return data as T;
}

export async function loginUser(credentials: LoginRequest): Promise<AuthSuccessResponse> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(credentials),
  });

  return handleResponse<AuthSuccessResponse>(response);
}

export async function registerStudent(data: RegisterRequest): Promise<AuthSuccessResponse> {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  return handleResponse<AuthSuccessResponse>(response);
}

export async function fetchCurrentUser(): Promise<UserResponse | null> {
  const response = await fetch('/api/auth/me', {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    credentials: 'include',
  });

  if (response.status === 401) {
    return null;
  }

  const result = await handleResponse<{ success: boolean; user: UserResponse }>(response);
  return result?.user ?? null;
}

export async function logoutUser(): Promise<void> {
  const response = await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include',
  });

  await handleResponse<{ success: boolean; message: string }>(response);
}
