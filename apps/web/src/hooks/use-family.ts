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
  return useQuery({
    queryKey: ['families', familyId, 'members'],
    queryFn: () => familyApi.getMembers(familyId),
    enabled: !!familyId,
  });
}

export function usePendingInvitations(familyId: string) {
  return useQuery({
    queryKey: ['families', familyId, 'invitations'],
    queryFn: () => familyApi.getPendingInvitations(familyId),
    enabled: !!familyId,
  });
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

export function useInviteMember(familyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: InviteMemberInput) => familyApi.invite(familyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['families', familyId, 'invitations'] });
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
      queryClient.invalidateQueries({ queryKey: ['families', familyId, 'invitations'] });
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

