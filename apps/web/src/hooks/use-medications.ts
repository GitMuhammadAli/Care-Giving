'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { medicationsApi, CreateMedicationInput, LogMedicationInput } from '@/lib/api';
import { toast } from 'react-hot-toast';

export function useMedications(careRecipientId: string) {
  return useQuery({
    queryKey: ['medications', careRecipientId],
    queryFn: () => medicationsApi.list(careRecipientId),
    enabled: !!careRecipientId,
  });
}

export function useMedication(careRecipientId: string, id: string) {
  return useQuery({
    queryKey: ['medications', careRecipientId, 'detail', id],
    queryFn: () => medicationsApi.get(careRecipientId, id),
    enabled: !!careRecipientId && !!id,
  });
}

export function useTodaysMedications(careRecipientId: string, date?: string) {
  return useQuery({
    queryKey: ['medications', careRecipientId, 'schedule', date || 'today'],
    queryFn: () => medicationsApi.getTodaySchedule(careRecipientId, date),
    enabled: !!careRecipientId,
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}


export function useCreateMedication(careRecipientId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateMedicationInput) => medicationsApi.create(careRecipientId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications', careRecipientId] });
      toast.success('Medication added');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add medication');
    },
  });
}

export function useLogMedication(careRecipientId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ medicationId, data }: { medicationId: string; data: LogMedicationInput }) =>
      medicationsApi.log(medicationId, data),
    onMutate: async ({ medicationId, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['medications', careRecipientId, 'schedule'] });

      // Snapshot previous value
      const previousSchedule = queryClient.getQueryData(['medications', careRecipientId, 'schedule', 'today']);

      // Optimistically update
      queryClient.setQueryData(
        ['medications', careRecipientId, 'schedule', 'today'],
        (old: any) => {
          if (!old) return old;
          return old.map((item: any) =>
            item.medication.id === medicationId && item.scheduledTime === data.scheduledTime
              ? { ...item, status: data.status, isPending: true }
              : item
          );
        }
      );

      return { previousSchedule };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousSchedule) {
        queryClient.setQueryData(
          ['medications', careRecipientId, 'schedule', 'today'],
          context.previousSchedule
        );
      }
      toast.error('Failed to log medication');
    },
    onSuccess: (_, variables) => {
      toast.success(variables.data.status === 'GIVEN' ? 'Medication logged' : 'Medication skipped');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['medications', careRecipientId] });
    },
  });
}

