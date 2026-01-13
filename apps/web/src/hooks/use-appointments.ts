'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentsApi, CreateAppointmentInput, AssignTransportInput } from '@/lib/api';
import { toast } from 'react-hot-toast';

export function useAppointments(careRecipientId: string) {
  return useQuery({
    queryKey: ['appointments', careRecipientId],
    queryFn: () => appointmentsApi.list(careRecipientId),
    enabled: !!careRecipientId,
  });
}

export function useUpcomingAppointments(careRecipientId: string, days = 7) {
  return useQuery({
    queryKey: ['appointments', careRecipientId, 'upcoming', days],
    queryFn: () => appointmentsApi.getUpcoming(careRecipientId, days),
    enabled: !!careRecipientId,
  });
}

export function useAppointmentsForDay(careRecipientId: string, date: string) {
  return useQuery({
    queryKey: ['appointments', careRecipientId, 'day', date],
    queryFn: () => appointmentsApi.getForDay(careRecipientId, date),
    enabled: !!careRecipientId && !!date,
  });
}

export function useAppointment(id: string) {
  return useQuery({
    queryKey: ['appointments', 'detail', id],
    queryFn: () => appointmentsApi.get(id),
    enabled: !!id,
  });
}

export function useCreateAppointment(careRecipientId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAppointmentInput) => appointmentsApi.create(careRecipientId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', careRecipientId] });
      toast.success('Appointment created');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create appointment');
    },
  });
}

export function useUpdateAppointment(careRecipientId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateAppointmentInput> }) =>
      appointmentsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', careRecipientId] });
      toast.success('Appointment updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update appointment');
    },
  });
}

export function useCancelAppointment(careRecipientId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => appointmentsApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', careRecipientId] });
      toast.success('Appointment cancelled');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to cancel appointment');
    },
  });
}

export function useAssignTransport(careRecipientId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ appointmentId, data }: { appointmentId: string; data: AssignTransportInput }) =>
      appointmentsApi.assignTransport(appointmentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', careRecipientId] });
      toast.success('Transport assigned');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to assign transport');
    },
  });
}

