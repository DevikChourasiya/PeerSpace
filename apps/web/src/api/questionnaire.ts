import type {
  QuestionnaireResponse,
  QuestionnaireCreateInput,
  QuestionnaireUpdateInput,
  QuestionnaireVersionResponse,
} from '@peerspace/shared';

export class QuestionnaireApiError extends Error {
  code: string;
  status: number;

  constructor(status: number, message: string, code: string = 'QUESTIONNAIRE_ERROR') {
    super(message);
    this.name = 'QuestionnaireApiError';
    this.status = status;
    this.code = code;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg = data?.error?.message || `Request failed with HTTP status ${response.status}`;
    const errorCode = data?.error?.code || 'QUESTIONNAIRE_ERROR';
    throw new QuestionnaireApiError(response.status, errorMsg, errorCode);
  }

  return data as T;
}

export async function fetchQuestionnaires(): Promise<{
  success: true;
  count: number;
  questionnaires: QuestionnaireResponse[];
}> {
  const response = await fetch('/api/admin/questionnaires', {
    method: 'GET',
    headers: { Accept: 'application/json' },
    credentials: 'include',
  });
  return handleResponse(response);
}

export async function fetchQuestionnaireById(id: string): Promise<{
  success: true;
  questionnaire: QuestionnaireResponse;
}> {
  const response = await fetch(`/api/admin/questionnaires/${id}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    credentials: 'include',
  });
  return handleResponse(response);
}

export async function createQuestionnaire(
  payload: QuestionnaireCreateInput
): Promise<{ success: true; message: string; questionnaire: QuestionnaireResponse }> {
  const response = await fetch('/api/admin/questionnaires', {
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

export async function updateQuestionnaire(
  id: string,
  payload: QuestionnaireUpdateInput
): Promise<{ success: true; message: string; questionnaire: QuestionnaireResponse }> {
  const response = await fetch(`/api/admin/questionnaires/${id}`, {
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

export async function duplicateQuestionnaire(
  id: string
): Promise<{ success: true; message: string; questionnaire: QuestionnaireResponse }> {
  const response = await fetch(`/api/admin/questionnaires/${id}/duplicate`, {
    method: 'POST',
    headers: { Accept: 'application/json' },
    credentials: 'include',
  });
  return handleResponse(response);
}

export async function publishQuestionnaire(id: string): Promise<{
  success: true;
  message: string;
  questionnaire: QuestionnaireResponse;
  publishedVersion: QuestionnaireVersionResponse;
}> {
  const response = await fetch(`/api/admin/questionnaires/${id}/publish`, {
    method: 'POST',
    headers: { Accept: 'application/json' },
    credentials: 'include',
  });
  return handleResponse(response);
}

export async function fetchQuestionnaireVersions(id: string): Promise<{
  success: true;
  count: number;
  versions: QuestionnaireVersionResponse[];
}> {
  const response = await fetch(`/api/admin/questionnaires/${id}/versions`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    credentials: 'include',
  });
  return handleResponse(response);
}

export async function fetchQuestionnaireVersionById(
  _id: string,
  versionId: string
): Promise<{
  success: true;
  version: QuestionnaireVersionResponse;
}> {
  const response = await fetch(`/api/rounds/rubrics/versions/${versionId}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    credentials: 'include',
  });
  return handleResponse(response);
}
