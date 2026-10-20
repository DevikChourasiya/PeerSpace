import type {
  CreateFeedbackReportInput,
  ResolveFeedbackReportInput,
  PaginatedModerationReportsResponse,
} from '@peerspace/shared';

export const reportFeedbackComment = async (
  input: CreateFeedbackReportInput
): Promise<{ id: string; message: string }> => {
  const res = await fetch('/api/feedback/reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || 'Failed to submit feedback report.');
  }
  return { id: data.data.id, message: data.message };
};

export const getModerationReports = async (
  page = 1,
  limit = 20,
  status?: string
): Promise<PaginatedModerationReportsResponse> => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  if (status) {
    params.append('status', status);
  }

  const res = await fetch(`/api/admin/moderation/reports?${params.toString()}`, {
    credentials: 'include',
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error?.message || 'Failed to fetch moderation reports.');
  }
  return (
    json.data ?? {
      items: [],
      total: 0,
      page,
      limit,
      totalPages: 1,
      pendingCount: 0,
    }
  );
};

export const resolveModerationReport = async (
  reportId: string,
  input: ResolveFeedbackReportInput
): Promise<{ id: string; status: string; actionTaken: string }> => {
  const res = await fetch(`/api/admin/moderation/reports/${reportId}/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || 'Failed to resolve moderation report.');
  }
  return data.data;
};
