'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { familyApi, CreateFamilyInput, InviteMemberInput } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { useAuth } from './use-auth';

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
  const refetchUser = useAuth((state) => state.refetchUser);

  return useMutation({
    mutationFn: (data: CreateFamilyInput) => familyApi.create(data),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['families'] });
      await refetchUser(); // Refetch user to get updated families in Zustand
      toast.success('Family space created');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create family space');
    },
  });
}

export function useUpdateFamily() {
  const queryClient = useQueryClient();
  const refetchUser = useAuth((state) => state.refetchUser);

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateFamilyInput> }) =>
      familyApi.update(id, data),
    onSuccess: async (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['families'] });
      queryClient.invalidateQueries({ queryKey: ['families', variables.id] });
      await refetchUser(); // Refetch user to get updated families in Zustand
      toast.success('Family space updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update family space');
    },
  });
}

export function useInviteMember(familyId?: string) {
  const queryClient = useQueryClient();
  const refetchUser = useAuth((state) => state.refetchUser);

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
    onSuccess: async (_, variables) => {
      const targetFamilyId = variables.familyId || familyId;
      queryClient.invalidateQueries({ queryKey: ['families', targetFamilyId] });
      await refetchUser();
      toast.success('Invitation sent');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to send invitation');
    },
  });
}

export function useUpdateMemberRole(familyId: string) {
  const queryClient = useQueryClient();
  const refetchUser = useAuth((state) => state.refetchUser);

  return useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: string }) =>
      familyApi.updateMemberRole(familyId, memberId, role),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['families', familyId] });
      await refetchUser();
      toast.success('Role updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update role');
    },
  });
}

export function useRemoveMember(familyId: string) {
  const queryClient = useQueryClient();
  const refetchUser = useAuth((state) => state.refetchUser);

  return useMutation({
    mutationFn: (memberId: string) => familyApi.removeMember(familyId, memberId),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['families', familyId] });
      await refetchUser();
      toast.success('Member removed');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove member');
    },
  });
}

export function useCancelInvitation(familyId: string) {
  const queryClient = useQueryClient();
  const refetchUser = useAuth((state) => state.refetchUser);

  return useMutation({
    mutationFn: (invitationId: string) => familyApi.cancelInvitation(familyId, invitationId),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['families', familyId] });
      await refetchUser();
      toast.success('Invitation cancelled');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to cancel invitation');
    },
  });
}

export function useResendInvitation(familyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invitationId: string) => familyApi.resendInvitation(familyId, invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['families', familyId] });
      toast.success('Invitation resent');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to resend invitation');
    },
  });
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient();
  const refetchUser = useAuth((state) => state.refetchUser);

  return useMutation({
    mutationFn: (token: string) => familyApi.acceptInvitation(token),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['families'] });
      await refetchUser();
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

export function useDeleteFamily(options?: { onSuccessCallback?: () => void }) {
  const queryClient = useQueryClient();
  const refetchUser = useAuth((state) => state.refetchUser);

  return useMutation({
    mutationFn: (familyId: string) => familyApi.delete(familyId),
    onSuccess: async () => {
      // Show success message first
      toast.success('Family deleted successfully');

      // Call custom callback (e.g., for navigation) BEFORE state updates
      // This prevents re-renders on the current page
      if (options?.onSuccessCallback) {
        options.onSuccessCallback();
      }

      // Then update state in background (after navigation started)
      queryClient.invalidateQueries({ queryKey: ['families'] });
      await refetchUser();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete family');
    },
  });
}

