'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { familyApi, CreateFamilyInput, InviteMemberInput } from '@/lib/api';
import { toast } from 'react-hot-toast';

export function useFamilies() {
  return useQuery({
    queryKey: ['families'],
    queryFn: () => familyApi.list(),
  });
}

export function useFamily(id: string) {
  return useQuery({
    queryKey: ['families', id],
    queryFn: () => familyApi.get(id),
    enabled: !!id,
  });
}

export function useFamilyMembers(familyId: string) {
  const familyQuery = useFamily(familyId);
  return {
    ...familyQuery,
    data: familyQuery.data?.members || [],
  };
}

export function usePendingInvitations(familyId: string) {
  const familyQuery = useFamily(familyId);
  return {
    ...familyQuery,
    data: familyQuery.data?.invitations || [],
  };
}

export function useCreateFamily() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateFamilyInput) => familyApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['families'] });
      toast.success('Family created');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create family');
    },
  });
}

export function useInviteMember(familyId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: InviteMemberInput & { familyId?: string }) => {
      // Use familyId from data if provided, otherwise use the one from hook
      const targetFamilyId = data.familyId || familyId;
      if (!targetFamilyId) {
        throw new Error('Family ID is required');
      }
      const { familyId: _, ...inviteData } = data;
      return familyApi.invite(targetFamilyId, inviteData);
    },
    onSuccess: (_, variables) => {
      const targetFamilyId = variables.familyId || familyId;
      queryClient.invalidateQueries({ queryKey: ['families', targetFamilyId] });
      queryClient.invalidateQueries({ queryKey: ['auth'] });
      toast.success('Invitation sent');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to send invitation');
    },
  });
}

export function useUpdateMemberRole(familyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: string }) =>
      familyApi.updateMemberRole(familyId, memberId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['families', familyId] });
      toast.success('Role updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update role');
    },
  });
}

export function useRemoveMember(familyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memberId: string) => familyApi.removeMember(familyId, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['families', familyId] });
      toast.success('Member removed');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove member');
    },
  });
}

export function useCancelInvitation(familyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invitationId: string) => familyApi.cancelInvitation(familyId, invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['families', familyId] });
      toast.success('Invitation cancelled');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to cancel invitation');
    },
  });
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (token: string) => familyApi.acceptInvitation(token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['families'] });
      toast.success('Welcome to the family!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to accept invitation');
    },
  });
}

export function useResetMemberPassword(familyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => familyApi.resetMemberPassword(familyId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['families', familyId] });
      toast.success('Password reset successfully. Temporary password sent via email.');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to reset password');
    },
  });
}

