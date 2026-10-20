import { useQuery } from '@tanstack/react-query';
import { fetchStudentDirectory, DirectoryApiError } from '../api/directory';
import type { StudentDirectoryQuery, StudentDirectoryResponse } from '@peerspace/shared';

export const DIRECTORY_QUERY_KEY = ['student-directory'] as const;

export function useDirectory(query: Partial<StudentDirectoryQuery> = {}) {
  const { data, isLoading, isFetching, error, refetch } = useQuery<
    StudentDirectoryResponse,
    DirectoryApiError
  >({
    queryKey: [DIRECTORY_QUERY_KEY, query],
    queryFn: () => fetchStudentDirectory(query),
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: true,
  });

  return {
    students: data?.students ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? 1,
    limit: data?.limit ?? 12,
    totalPages: data?.totalPages ?? 1,
    isLoading,
    isFetching,
    error,
    refetch,
  };
}
