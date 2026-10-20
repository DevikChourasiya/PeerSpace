import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchCurrentUser,
  loginUser,
  registerStudent,
  logoutUser,
  AuthApiError,
  type AuthSuccessResponse,
} from '../api/auth';
import type { LoginRequest, RegisterRequest, UserResponse } from '@peerspace/shared';

export const AUTH_USER_QUERY_KEY = ['auth-user'] as const;

export function useAuth() {
  const queryClient = useQueryClient();

  const {
    data: user,
    isLoading,
    isFetching,
    error: userError,
    refetch: refetchUser,
  } = useQuery<UserResponse | null, Error>({
    queryKey: AUTH_USER_QUERY_KEY,
    queryFn: fetchCurrentUser,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false,
    refetchOnWindowFocus: true,
  });

  const loginMutation = useMutation<AuthSuccessResponse, AuthApiError, LoginRequest>({
    mutationFn: loginUser,
    onSuccess: (data) => {
      queryClient.setQueryData(AUTH_USER_QUERY_KEY, data.user);
    },
  });

  const registerMutation = useMutation<AuthSuccessResponse, AuthApiError, RegisterRequest>({
    mutationFn: registerStudent,
    onSuccess: (data) => {
      queryClient.setQueryData(AUTH_USER_QUERY_KEY, data.user);
    },
  });

  const logoutMutation = useMutation<void, AuthApiError, void>({
    mutationFn: logoutUser,
    onSuccess: () => {
      queryClient.setQueryData(AUTH_USER_QUERY_KEY, null);
      queryClient.removeQueries({ queryKey: AUTH_USER_QUERY_KEY });
    },
  });

  return {
    user: user ?? null,
    isLoading,
    isFetching,
    isAuthenticated: Boolean(user),
    userError,
    refetchUser,
    loginMutation,
    registerMutation,
    logoutMutation,
  };
}
