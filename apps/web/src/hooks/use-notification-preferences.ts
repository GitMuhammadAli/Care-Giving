'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi, type NotificationPreferences } from '@/lib/api/user';
import toast from 'react-hot-toast';

const QUERY_KEY = ['notification-preferences'];

/**
 * Hook for fetching and updating notification preferences
 */
export function useNotificationPreferences() {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: userApi.getNotificationPreferences,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const updateMutation = useMutation({
    mutationFn: (preferences: Partial<NotificationPreferences>) =>
      userApi.updateNotificationPreferences(preferences),
    onMutate: async (newPreferences) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });

      // Snapshot the previous value
      const previousPreferences = queryClient.getQueryData<NotificationPreferences>(QUERY_KEY);

      // Optimistically update to the new value
      if (previousPreferences) {
        queryClient.setQueryData<NotificationPreferences>(QUERY_KEY, {
          ...previousPreferences,
          ...newPreferences,
        });
      }

      return { previousPreferences };
    },
    onError: (err, _newPreferences, context) => {
      // Rollback on error
      if (context?.previousPreferences) {
        queryClient.setQueryData(QUERY_KEY, context.previousPreferences);
      }
      toast.error('Failed to update preferences');
      console.error('Preference update error:', err);
    },
    onSuccess: () => {
      toast.success('Preferences updated');
    },
    onSettled: () => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  const updatePreference = (key: keyof NotificationPreferences, value: boolean) => {
    // Don't allow disabling emergency alerts
    if (key === 'emergencyAlerts' && !value) {
      toast.error('Emergency alerts cannot be disabled for safety');
      return;
    }

    updateMutation.mutate({ [key]: value });
  };

  const togglePreference = (key: keyof NotificationPreferences) => {
    if (!data) return;
    
    // Don't allow toggling emergency alerts off
    if (key === 'emergencyAlerts') {
      toast.error('Emergency alerts cannot be disabled for safety');
      return;
    }

    updatePreference(key, !data[key]);
  };

  return {
    preferences: data,
    isLoading,
    error,
    refetch,
    updatePreference,
    togglePreference,
    isUpdating: updateMutation.isPending,
  };
}

