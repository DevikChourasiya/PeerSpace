import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchAdminRounds,
  createRound,
  updateRound,
  transitionRoundStatus,
  fetchStudentRounds,
  RoundApiError,
} from '../api/round';
import type {
  FeedbackRoundResponse,
  FeedbackRoundCreateInput,
  FeedbackRoundUpdateInput,
  RoundStatusTransitionInput,
} from '@peerspace/shared';

export const ADMIN_ROUNDS_QUERY_KEY = ['admin-rounds'] as const;
export const STUDENT_ROUNDS_QUERY_KEY = ['student-rounds'] as const;

export function useAdminRounds(statusFilter?: string) {
  const queryClient = useQueryClient();

  const roundsQuery = useQuery<
    {
      success: true;
      count: number;
      rounds: FeedbackRoundResponse[];
    },
    RoundApiError
  >({
    queryKey: [ADMIN_ROUNDS_QUERY_KEY, statusFilter],
    queryFn: () => fetchAdminRounds(statusFilter),
    staleTime: 1000 * 30,
    refetchOnWindowFocus: true,
  });

  const invalidateRounds = async () => {
    await queryClient.invalidateQueries({ queryKey: [ADMIN_ROUNDS_QUERY_KEY] });
  };

  const createMutation = useMutation<
    { success: true; message: string; round: FeedbackRoundResponse },
    RoundApiError,
    FeedbackRoundCreateInput
  >({
    mutationFn: createRound,
    onSuccess: async () => {
      await invalidateRounds();
    },
  });

  const updateMutation = useMutation<
    { success: true; message: string; round: FeedbackRoundResponse },
    RoundApiError,
    { id: string; payload: FeedbackRoundUpdateInput }
  >({
    mutationFn: ({ id, payload }) => updateRound(id, payload),
    onSuccess: async () => {
      await invalidateRounds();
    },
  });

  const transitionMutation = useMutation<
    { success: true; message: string; round: FeedbackRoundResponse },
    RoundApiError,
    { id: string; payload: RoundStatusTransitionInput }
  >({
    mutationFn: ({ id, payload }) => transitionRoundStatus(id, payload),
    onSuccess: async () => {
      await invalidateRounds();
    },
  });

  return {
    roundsQuery,
    rounds: roundsQuery.data?.rounds ?? [],
    createMutation,
    updateMutation,
    transitionMutation,
    invalidateRounds,
  };
}

export function useStudentRounds() {
  const { data, isLoading, isFetching, error, refetch } = useQuery<
    {
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
        questionnaireId?: string;
        questionnaireVersionId?: string;
        questionnaireTitle?: string;
        questionCount: number;
      }>;
    },
    RoundApiError
  >({
    queryKey: STUDENT_ROUNDS_QUERY_KEY,
    queryFn: fetchStudentRounds,
    staleTime: 1000 * 60,
    refetchOnWindowFocus: true,
  });

  return {
    rounds: data?.rounds ?? [],
    isLoading,
    isFetching,
    error,
    refetch,
  };
}
