'use client';

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { timelineApi, CreateTimelineEntryInput } from '@/lib/api';
import { toast } from 'react-hot-toast';

export function useTimeline(
  careRecipientId: string,
  options?: { type?: string; limit?: number }
) {
  return useInfiniteQuery({
    queryKey: ['timeline', careRecipientId, options?.type],
    queryFn: ({ pageParam = 0 }) =>
      timelineApi.list(careRecipientId, {
        type: options?.type,
        limit: options?.limit || 20,
        offset: pageParam,
      }),
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage || !Array.isArray(lastPage) || lastPage.length < (options?.limit || 20)) return undefined;
      return allPages.flat().length;
    },
    initialPageParam: 0,
    enabled: !!careRecipientId && careRecipientId.length > 0,
  });
}

export function useVitalsHistory(careRecipientId: string, days = 30) {
  return useQuery({
    queryKey: ['timeline', careRecipientId, 'vitals', days],
    queryFn: () => timelineApi.getVitalsHistory(careRecipientId, days),
    enabled: !!careRecipientId,
  });
}

export function useIncidents(careRecipientId: string) {
  return useQuery({
    queryKey: ['timeline', careRecipientId, 'incidents'],
    queryFn: () => timelineApi.getIncidents(careRecipientId),
    enabled: !!careRecipientId,
  });
}

export function useCreateTimelineEntry(careRecipientId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTimelineEntryInput) => timelineApi.create(careRecipientId, data),
    onSuccess: (newEntry) => {
      // Optimistically add to the beginning of the timeline
      queryClient.setQueryData(
        ['timeline', careRecipientId, undefined],
        (old: any) => {
          if (!old?.pages) return old;
          return {
            ...old,
            pages: [[newEntry, ...old.pages[0]], ...old.pages.slice(1)],
          };
        }
      );
      queryClient.invalidateQueries({ queryKey: ['timeline', careRecipientId] });
      toast.success('Entry added to timeline');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add entry');
    },
  });
}

export function useDeleteTimelineEntry(careRecipientId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => timelineApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeline', careRecipientId] });
      toast.success('Entry deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete entry');
    },
  });
}

