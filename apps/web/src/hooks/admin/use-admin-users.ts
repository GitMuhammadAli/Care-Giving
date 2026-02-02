'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, UserFilter } from '@/lib/api/admin';
import { toast } from 'react-hot-toast';

export function useAdminUsers(filter: UserFilter = {}) {
  return useQuery({
    queryKey: ['admin', 'users', filter],
    queryFn: () => adminApi.getUsers(filter),
  });
}

export function useAdminUser(id: string) {
  return useQuery({
    queryKey: ['admin', 'users', id],
    queryFn: () => adminApi.getUser(id),
    enabled: !!id,
  });
}

export function useCreateAdminUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: adminApi.createUser,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success(data.message);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create user');
    },
  });
}

export function useUpdateAdminUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof adminApi.updateUser>[1] }) =>
      adminApi.updateUser(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users', variables.id] });
      toast.success('User updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update user');
    },
  });
}

export function useSuspendUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      adminApi.suspendUser(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success('User suspended');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to suspend user');
    },
  });
}

export function useActivateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => adminApi.activateUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success('User activated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to activate user');
    },
  });
}

export function useResetUserPassword() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => adminApi.resetUserPassword(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success(data.message);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to reset password');
    },
  });
}

export function useDeleteAdminUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      adminApi.deleteUser(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success('User deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete user');
    },
  });
}

export function useBulkUserAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: adminApi.bulkUserAction,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success(data.message);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to perform bulk action');
    },
  });
}

export function useUserActivity(id: string) {
  return useQuery({
    queryKey: ['admin', 'users', id, 'activity'],
    queryFn: () => adminApi.getUserActivity(id),
    enabled: !!id,
  });
}

