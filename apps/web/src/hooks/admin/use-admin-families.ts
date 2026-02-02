'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, FamilyFilter } from '@/lib/api/admin';
import { toast } from 'react-hot-toast';

export function useAdminFamilies(filter: FamilyFilter = {}) {
  return useQuery({
    queryKey: ['admin', 'families', filter],
    queryFn: () => adminApi.getFamilies(filter),
  });
}

export function useAdminFamily(id: string) {
  return useQuery({
    queryKey: ['admin', 'families', id],
    queryFn: () => adminApi.getFamily(id),
    enabled: !!id,
  });
}

export function useUpdateAdminFamily() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string } }) =>
      adminApi.updateFamily(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'families'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'families', variables.id] });
      toast.success('Family updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update family');
    },
  });
}

export function useDeleteAdminFamily() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      adminApi.deleteFamily(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'families'] });
      toast.success('Family deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete family');
    },
  });
}

export function useFamilyMembers(familyId: string) {
  return useQuery({
    queryKey: ['admin', 'families', familyId, 'members'],
    queryFn: () => adminApi.getFamilyMembers(familyId),
    enabled: !!familyId,
  });
}

export function useAddFamilyMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      familyId,
      userId,
      role,
    }: {
      familyId: string;
      userId: string;
      role: 'ADMIN' | 'CAREGIVER' | 'VIEWER';
    }) => adminApi.addFamilyMember(familyId, { userId, role }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['admin', 'families', variables.familyId],
      });
      toast.success('Member added');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add member');
    },
  });
}

export function useRemoveFamilyMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ familyId, memberId }: { familyId: string; memberId: string }) =>
      adminApi.removeFamilyMember(familyId, memberId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['admin', 'families', variables.familyId],
      });
      toast.success('Member removed');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove member');
    },
  });
}

export function useTransferOwnership() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ familyId, newOwnerId }: { familyId: string; newOwnerId: string }) =>
      adminApi.transferOwnership(familyId, newOwnerId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['admin', 'families', variables.familyId],
      });
      toast.success('Ownership transferred');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to transfer ownership');
    },
  });
}

export function useFamilyActivity(familyId: string) {
  return useQuery({
    queryKey: ['admin', 'families', familyId, 'activity'],
    queryFn: () => adminApi.getFamilyActivity(familyId),
    enabled: !!familyId,
  });
}

