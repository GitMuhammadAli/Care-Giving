'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { emergencyApi, CreateEmergencyAlertInput } from '@/lib/api';
import { toast } from 'react-hot-toast';

export function useEmergencyInfo(careRecipientId: string) {
  return useQuery({
    queryKey: ['emergency', careRecipientId],
    queryFn: () => emergencyApi.getEmergencyInfo(careRecipientId),
    enabled: !!careRecipientId,
    staleTime: 5 * 60 * 1000, // Keep fresh for 5 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
  });
}

export function useActiveAlerts(careRecipientId: string) {
  return useQuery({
    queryKey: ['emergency', careRecipientId, 'alerts'],
    queryFn: () => emergencyApi.getActiveAlerts(careRecipientId),
    enabled: !!careRecipientId,
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
  });
}

export function useTriggerAlert(careRecipientId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateEmergencyAlertInput) => emergencyApi.triggerAlert(careRecipientId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emergency', careRecipientId, 'alerts'] });
      toast.success('Emergency alert sent to all family members');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to send emergency alert');
    },
  });
}

export function useResolveAlert(careRecipientId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ alertId, notes }: { alertId: string; notes?: string }) =>
      emergencyApi.resolveAlert(alertId, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emergency', careRecipientId, 'alerts'] });
      toast.success('Alert resolved');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to resolve alert');
    },
  });
}

