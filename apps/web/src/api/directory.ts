import type { StudentDirectoryQuery, StudentDirectoryResponse } from '@peerspace/shared';

export class DirectoryApiError extends Error {
  code: string;
  status: number;

  constructor(status: number, message: string, code: string = 'DIRECTORY_ERROR') {
    super(message);
    this.name = 'DirectoryApiError';
    this.status = status;
    this.code = code;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg = data?.error?.message || `Request failed with HTTP status ${response.status}`;
    const errorCode = data?.error?.code || 'DIRECTORY_ERROR';
    throw new DirectoryApiError(response.status, errorMsg, errorCode);
  }

  return data as T;
}

export async function fetchStudentDirectory(
  query: Partial<StudentDirectoryQuery> = {}
): Promise<StudentDirectoryResponse> {
  const params = new URLSearchParams();

  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  if (query.search) params.set('search', query.search);
  if (query.classSection) params.set('classSection', query.classSection);
  if (query.department) params.set('department', query.department);

  const url = `/api/students${params.toString() ? `?${params.toString()}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    credentials: 'include',
  });

  return handleResponse<StudentDirectoryResponse>(response);
}
