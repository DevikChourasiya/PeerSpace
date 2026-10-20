import type { ReceivedFeedbackItem, StudentAnalyticsResponse } from '@peerspace/shared';

export const getReceivedFeedback = async (): Promise<ReceivedFeedbackItem[]> => {
  const res = await fetch('/api/feedback/received', {
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || 'Failed to fetch received feedback.');
  }
  return data.data;
};

export const getStudentAnalytics = async (): Promise<StudentAnalyticsResponse> => {
  const res = await fetch('/api/feedback/analytics', {
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || 'Failed to fetch analytics.');
  }
  return data.data;
};
