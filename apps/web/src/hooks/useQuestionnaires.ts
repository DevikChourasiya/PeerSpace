import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchQuestionnaires,
  createQuestionnaire,
  updateQuestionnaire,
  duplicateQuestionnaire,
  publishQuestionnaire,
  fetchQuestionnaireVersionById,
  QuestionnaireApiError,
} from '../api/questionnaire';
import type {
  QuestionnaireResponse,
  QuestionnaireCreateInput,
  QuestionnaireUpdateInput,
  QuestionnaireVersionResponse,
} from '@peerspace/shared';

export const QUESTIONNAIRES_QUERY_KEY = ['admin-questionnaires'] as const;

export function useQuestionnaires() {
  const queryClient = useQueryClient();

  const questionnairesQuery = useQuery<
    {
      success: true;
      count: number;
      questionnaires: QuestionnaireResponse[];
    },
    QuestionnaireApiError
  >({
    queryKey: QUESTIONNAIRES_QUERY_KEY,
    queryFn: fetchQuestionnaires,
    staleTime: 1000 * 30,
    refetchOnWindowFocus: true,
  });

  const invalidateQuestionnaires = async () => {
    await queryClient.invalidateQueries({ queryKey: QUESTIONNAIRES_QUERY_KEY });
  };

  const createMutation = useMutation<
    { success: true; message: string; questionnaire: QuestionnaireResponse },
    QuestionnaireApiError,
    QuestionnaireCreateInput
  >({
    mutationFn: createQuestionnaire,
    onSuccess: async () => {
      await invalidateQuestionnaires();
    },
  });

  const updateMutation = useMutation<
    { success: true; message: string; questionnaire: QuestionnaireResponse },
    QuestionnaireApiError,
    { id: string; payload: QuestionnaireUpdateInput }
  >({
    mutationFn: ({ id, payload }) => updateQuestionnaire(id, payload),
    onSuccess: async () => {
      await invalidateQuestionnaires();
    },
  });

  const duplicateMutation = useMutation<
    { success: true; message: string; questionnaire: QuestionnaireResponse },
    QuestionnaireApiError,
    string
  >({
    mutationFn: duplicateQuestionnaire,
    onSuccess: async () => {
      await invalidateQuestionnaires();
    },
  });

  const publishMutation = useMutation<
    {
      success: true;
      message: string;
      questionnaire: QuestionnaireResponse;
      publishedVersion: QuestionnaireVersionResponse;
    },
    QuestionnaireApiError,
    string
  >({
    mutationFn: publishQuestionnaire,
    onSuccess: async () => {
      await invalidateQuestionnaires();
    },
  });

  return {
    questionnairesQuery,
    questionnaires: questionnairesQuery.data?.questionnaires ?? [],
    createMutation,
    updateMutation,
    duplicateMutation,
    publishMutation,
    invalidateQuestionnaires,
  };
}

export function useQuestionnaireVersion(questionnaireId?: string, versionId?: string) {
  return useQuery({
    queryKey: ['questionnaireVersion', questionnaireId, versionId],
    queryFn: async () => {
      if (!questionnaireId || !versionId) return null;
      const res = await fetchQuestionnaireVersionById(questionnaireId, versionId);
      return res.version;
    },
    enabled: Boolean(questionnaireId && versionId),
  });
}
