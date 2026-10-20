import type {
  FeedbackRoundResponse,
  FeedbackRoundCreateInput,
  FeedbackRoundUpdateInput,
  RoundStatusTransitionInput,
  FeedbackRoundProgress,
} from '@peerspace/shared';

export class RoundApiError extends Error {
  code: string;
  status: number;

  constructor(status: number, message: string, code: string = 'ROUND_ERROR') {
    super(message);
    this.name = 'RoundApiError';
    this.status = status;
    this.code = code;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg = data?.error?.message || `Request failed with HTTP status ${response.status}`;
    const errorCode = data?.error?.code || 'ROUND_ERROR';
    throw new RoundApiError(response.status, errorMsg, errorCode);
  }

  return data as T;
}

export async function fetchAdminRounds(status?: string): Promise<{
  success: true;
  count: number;
  rounds: FeedbackRoundResponse[];
}> {
  const url = status
    ? `/api/admin/rounds?status=${encodeURIComponent(status)}`
    : '/api/admin/rounds';
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    credentials: 'include',
  });
  return handleResponse(response);
}

export async function fetchRoundById(id: string): Promise<{
  success: true;
  round: FeedbackRoundResponse;
}> {
  const response = await fetch(`/api/admin/rounds/${id}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    credentials: 'include',
  });
  return handleResponse(response);
}

export async function createRound(
  payload: FeedbackRoundCreateInput
): Promise<{ success: true; message: string; round: FeedbackRoundResponse }> {
  const response = await fetch('/api/admin/rounds', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
}

export async function updateRound(
  id: string,
  payload: FeedbackRoundUpdateInput
): Promise<{ success: true; message: string; round: FeedbackRoundResponse }> {
  const response = await fetch(`/api/admin/rounds/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
}

export async function transitionRoundStatus(
  id: string,
  payload: RoundStatusTransitionInput
): Promise<{ success: true; message: string; round: FeedbackRoundResponse }> {
  const response = await fetch(`/api/admin/rounds/${id}/status`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
}

export async function fetchRoundProgress(id: string): Promise<{
  success: true;
  progress: FeedbackRoundProgress;
}> {
  const response = await fetch(`/api/admin/rounds/${id}/progress`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    credentials: 'include',
  });
  return handleResponse(response);
}

export async function fetchStudentRounds(): Promise<{
  success: true;
  count: number;
  rounds: Array<{
    id: string;
    title: string;
    description?: string;
    status: string;
    startDate: string;
    deadline: string;
    isAnonymous: boolean;
    allowSubmissionEdit: boolean;
    submissionsPerPeer: number;
    feedbackVisibility: string;
    targetClass: string;
    questionnaireTitle?: string;
    questionCount: number;
  }>;
}> {
  const response = await fetch('/api/rounds', {
    method: 'GET',
    headers: { Accept: 'application/json' },
    credentials: 'include',
  });
  return handleResponse(response);
}
