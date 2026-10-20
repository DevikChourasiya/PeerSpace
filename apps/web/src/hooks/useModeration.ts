import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  reportFeedbackComment,
  getModerationReports,
  resolveModerationReport,
} from '../api/moderation';
import type { CreateFeedbackReportInput, ResolveFeedbackReportInput } from '@peerspace/shared';

export const useModerationReports = (
  page = 1,
  limit = 20,
  status?: string,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: ['moderationReports', page, limit, status],
    queryFn: () => getModerationReports(page, limit, status),
    enabled: options?.enabled ?? true,
  });
};

export const useReportFeedback = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateFeedbackReportInput) => reportFeedbackComment(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receivedFeedback'] });
    },
  });
};

export const useResolveModerationReport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reportId, input }: { reportId: string; input: ResolveFeedbackReportInput }) =>
      resolveModerationReport(reportId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moderationReports'] });
      queryClient.invalidateQueries({ queryKey: ['receivedFeedback'] });
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
      queryClient.invalidateQueries({ queryKey: ['studentAnalytics'] });
    },
  });
};
