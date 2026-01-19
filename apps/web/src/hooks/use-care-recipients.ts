'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { careRecipientsApi, CareRecipient, CreateCareRecipientInput } from '@/lib/api';
import { useAuth } from './use-auth';
import toast from 'react-hot-toast';

// Query keys
export const careRecipientKeys = {
  all: ['care-recipients'] as const,
  lists: () => [...careRecipientKeys.all, 'list'] as const,
  list: (familyId: string) => [...careRecipientKeys.lists(), familyId] as const,
  details: () => [...careRecipientKeys.all, 'detail'] as const,
  detail: (id: string) => [...careRecipientKeys.details(), id] as const,
};

// List care recipients for a family
export function useCareRecipients(familyId: string) {
  return useQuery({
    queryKey: careRecipientKeys.list(familyId),
    queryFn: () => careRecipientsApi.list(familyId),
    enabled: !!familyId,
  });
}

// Get a single care recipient
export function useCareRecipient(id: string) {
  return useQuery({
    queryKey: careRecipientKeys.detail(id),
    queryFn: () => careRecipientsApi.get(id),
    enabled: !!id,
  });
}

// Create a care recipient
export function useCreateCareRecipient(familyId: string) {
  const queryClient = useQueryClient();
  const refetchUser = useAuth((state) => state.refetchUser);

  return useMutation({
    mutationFn: (data: CreateCareRecipientInput) => careRecipientsApi.create(familyId, data),
    onSuccess: async (newCareRecipient) => {
      queryClient.invalidateQueries({ queryKey: careRecipientKeys.list(familyId) });
      queryClient.invalidateQueries({ queryKey: ['all-care-recipients'] });
      queryClient.invalidateQueries({ queryKey: ['families'] });
      await refetchUser();
      toast.success(`${newCareRecipient.fullName} added successfully`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add care recipient');
    },
  });
}

// Update a care recipient
export function useUpdateCareRecipient(careRecipientId: string) {
  const queryClient = useQueryClient();
  const refetchUser = useAuth((state) => state.refetchUser);

  return useMutation({
    mutationFn: (data: Partial<CreateCareRecipientInput>) => careRecipientsApi.update(careRecipientId, data),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: careRecipientKeys.detail(careRecipientId) });
      queryClient.invalidateQueries({ queryKey: careRecipientKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ['all-care-recipients'] });
      await refetchUser();
      toast.success('Care recipient updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update care recipient');
    },
  });
}

// Delete a care recipient
export function useDeleteCareRecipient(familyId: string) {
  const queryClient = useQueryClient();
  const refetchUser = useAuth((state) => state.refetchUser);

  return useMutation({
    mutationFn: (careRecipientId: string) => careRecipientsApi.delete(careRecipientId),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: careRecipientKeys.list(familyId) });
      queryClient.invalidateQueries({ queryKey: ['all-care-recipients'] });
      queryClient.invalidateQueries({ queryKey: ['families'] });
      await refetchUser();
      toast.success('Care recipient removed');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to remove care recipient');
    },
  });
}
