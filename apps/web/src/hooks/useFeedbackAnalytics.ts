import { useQuery } from '@tanstack/react-query';
import { getReceivedFeedback, getStudentAnalytics } from '../api/feedback';

export const useReceivedFeedback = () => {
  return useQuery({
    queryKey: ['receivedFeedback'],
    queryFn: getReceivedFeedback,
  });
};

export const useStudentAnalytics = () => {
  return useQuery({
    queryKey: ['studentAnalytics'],
    queryFn: getStudentAnalytics,
  });
};
