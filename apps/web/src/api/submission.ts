import type {
  PeerCandidate,
  SubmissionResponse,
  CreateSubmissionDraftInput,
  SubmitEvaluationInput,
  UpdateSubmissionInput,
} from '@peerspace/shared';

export interface PeerCandidatesResult {
  roundId: string;
  roundTitle: string;
  submissionsPerPeer: number;
  submittedCount: number;
  candidates: PeerCandidate[];
}

export const getPeerCandidates = async (roundId: string): Promise<PeerCandidatesResult> => {
  const res = await fetch(`/api/rounds/${roundId}/peers`, {
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || 'Failed to fetch peer candidates.');
  }
  return (
    data.data || {
      roundId,
      roundTitle: '',
      submissionsPerPeer: 1,
      submittedCount: 0,
      candidates: [],
    }
  );
};

export const getPeerSubmission = async (
  roundId: string,
  peerId: string
): Promise<SubmissionResponse | null> => {
  const res = await fetch(`/api/rounds/${roundId}/submissions/peer/${peerId}`, {
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || 'Failed to fetch peer submission.');
  }
  return data.data ?? null;
};

export const saveSubmissionDraft = async (
  roundId: string,
  payload: CreateSubmissionDraftInput
): Promise<SubmissionResponse> => {
  const res = await fetch(`/api/rounds/${roundId}/submissions/draft`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || 'Failed to save submission draft.');
  }
  return data.data;
};

export const submitFinalEvaluation = async (
  roundId: string,
  payload: SubmitEvaluationInput
): Promise<SubmissionResponse> => {
  const res = await fetch(`/api/rounds/${roundId}/submissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || 'Failed to submit evaluation.');
  }
  return data.data;
};

export const updateSubmission = async (
  roundId: string,
  submissionId: string,
  payload: UpdateSubmissionInput
): Promise<SubmissionResponse> => {
  const res = await fetch(`/api/rounds/${roundId}/submissions/${submissionId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || 'Failed to update submission.');
  }
  return data.data;
};
