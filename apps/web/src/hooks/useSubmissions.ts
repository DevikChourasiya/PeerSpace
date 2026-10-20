import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPeerCandidates,
  getPeerSubmission,
  saveSubmissionDraft,
  submitFinalEvaluation,
  updateSubmission,
} from '../api/submission';
import type {
  CreateSubmissionDraftInput,
  SubmitEvaluationInput,
  UpdateSubmissionInput,
} from '@peerspace/shared';

export const useSubmissions = (roundId: string) => {
  const queryClient = useQueryClient();

  const candidatesQuery = useQuery({
    queryKey: ['candidates', roundId],
    queryFn: () => getPeerCandidates(roundId),
    enabled: Boolean(roundId),
  });

  const draftMutation = useMutation({
    mutationFn: (payload: CreateSubmissionDraftInput) => saveSubmissionDraft(roundId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates', roundId] });
      queryClient.invalidateQueries({ queryKey: ['peerSubmission', roundId] });
    },
  });

  const submitMutation = useMutation({
    mutationFn: (payload: SubmitEvaluationInput) => submitFinalEvaluation(roundId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates', roundId] });
      queryClient.invalidateQueries({ queryKey: ['peerSubmission', roundId] });
      queryClient.invalidateQueries({ queryKey: ['receivedFeedback'] });
      queryClient.invalidateQueries({ queryKey: ['studentAnalytics'] });
      queryClient.invalidateQueries({ queryKey: ['studentRounds'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      submissionId,
      payload,
    }: {
      submissionId: string;
      payload: UpdateSubmissionInput;
    }) => updateSubmission(roundId, submissionId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates', roundId] });
      queryClient.invalidateQueries({ queryKey: ['peerSubmission', roundId] });
      queryClient.invalidateQueries({ queryKey: ['receivedFeedback'] });
      queryClient.invalidateQueries({ queryKey: ['studentAnalytics'] });
    },
  });

  return {
    candidates: candidatesQuery.data?.candidates || [],
    candidatesResult: candidatesQuery.data,
    isLoading: candidatesQuery.isLoading,
    isError: candidatesQuery.isError,
    candidatesQuery,
    draftMutation,
    submitMutation,
    updateMutation,
  };
};

export const usePeerSubmission = (roundId: string, peerId: string) => {
  return useQuery({
    queryKey: ['peerSubmission', roundId, peerId],
    queryFn: () => getPeerSubmission(roundId, peerId),
    enabled: Boolean(roundId && peerId),
  });
};
