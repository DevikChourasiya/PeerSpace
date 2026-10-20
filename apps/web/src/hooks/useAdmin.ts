import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchPendingStudents,
  fetchAllMembers,
  approveStudentMembership,
  rejectStudentMembership,
  suspendUserAccount,
  reactivateUserAccount,
  AdminApiError,
  type AdminAllMembersResponse,
} from '../api/admin';
import type { PendingStudentsResponse, AdminMemberActionResponse } from '@peerspace/shared';

export const ADMIN_PENDING_STUDENTS_QUERY_KEY = ['admin-pending-students'] as const;
export const ADMIN_ALL_MEMBERS_QUERY_KEY = ['admin-all-members'] as const;

export function useAdmin(statusFilter?: string) {
  const queryClient = useQueryClient();

  const pendingQuery = useQuery<PendingStudentsResponse, AdminApiError>({
    queryKey: ADMIN_PENDING_STUDENTS_QUERY_KEY,
    queryFn: fetchPendingStudents,
    staleTime: 1000 * 30, // 30 seconds
    refetchOnWindowFocus: true,
  });

  const allMembersQuery = useQuery<AdminAllMembersResponse, AdminApiError>({
    queryKey: [ADMIN_ALL_MEMBERS_QUERY_KEY, statusFilter],
    queryFn: () => fetchAllMembers(statusFilter),
    staleTime: 1000 * 30,
    refetchOnWindowFocus: true,
  });

  const invalidateAdminQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ADMIN_PENDING_STUDENTS_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: [ADMIN_ALL_MEMBERS_QUERY_KEY] }),
    ]);
  };

  const approveMutation = useMutation<AdminMemberActionResponse, AdminApiError, string>({
    mutationFn: approveStudentMembership,
    onSuccess: async () => {
      await invalidateAdminQueries();
    },
  });

  const rejectMutation = useMutation<
    AdminMemberActionResponse,
    AdminApiError,
    { id: string; reason?: string }
  >({
    mutationFn: ({ id, reason }) => rejectStudentMembership(id, reason),
    onSuccess: async () => {
      await invalidateAdminQueries();
    },
  });

  const suspendMutation = useMutation<
    AdminMemberActionResponse,
    AdminApiError,
    { id: string; reason?: string }
  >({
    mutationFn: ({ id, reason }) => suspendUserAccount(id, reason),
    onSuccess: async () => {
      await invalidateAdminQueries();
    },
  });

  const reactivateMutation = useMutation<AdminMemberActionResponse, AdminApiError, string>({
    mutationFn: reactivateUserAccount,
    onSuccess: async () => {
      await invalidateAdminQueries();
    },
  });

  return {
    pendingQuery,
    allMembersQuery,
    approveMutation,
    rejectMutation,
    suspendMutation,
    reactivateMutation,
    invalidateAdminQueries,
  };
}
