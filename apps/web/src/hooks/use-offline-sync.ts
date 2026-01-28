'use client';

import { useEffect, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  getPendingActions,
  removePendingAction,
  updatePendingAction,
  setLastSync,
  isOnline,
  onOnlineStatusChange,
  PendingAction,
} from '@/lib/offline-storage';
import { api } from '@/lib/api/client';

const MAX_RETRIES = 3;

export function useOfflineSync() {
  const [online, setOnline] = useState(isOnline());
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const queryClient = useQueryClient();

  // Monitor online status
  useEffect(() => {
    const unsubscribe = onOnlineStatusChange((isOnline) => {
      setOnline(isOnline);
      
      if (isOnline) {
        toast.success('Back online! Syncing changes...', { icon: '🌐' });
        syncPendingActions();
      } else {
        toast('You are offline. Changes will sync when connected.', { 
          icon: '📴',
          duration: 4000,
        });
      }
    });

    return unsubscribe;
  }, []);

  // Check pending actions count - reduced frequency to avoid performance issues
  useEffect(() => {
    const checkPending = async () => {
      const pending = await getPendingActions();
      setPendingCount(pending.length);
    };
    
    checkPending();
    // Check every 60 seconds instead of 10 to reduce IndexedDB access
    const interval = setInterval(checkPending, 60000);
    
    return () => clearInterval(interval);
  }, []);

  // Sync pending actions when online
  const syncPendingActions = useCallback(async () => {
    if (!isOnline() || syncing) return;

    setSyncing(true);
    const pending = await getPendingActions();

    if (pending.length === 0) {
      setSyncing(false);
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const action of pending) {
      try {
        await processAction(action);
        await removePendingAction(action.id);
        successCount++;
      } catch (error) {
        console.error(`Failed to sync action ${action.id}:`, error);
        
        if (action.retryCount >= MAX_RETRIES) {
          await removePendingAction(action.id);
          failCount++;
        } else {
          await updatePendingAction(action.id, { 
            retryCount: action.retryCount + 1 
          });
        }
      }
    }

    if (successCount > 0) {
      toast.success(`Synced ${successCount} offline change${successCount > 1 ? 's' : ''}`);
      await setLastSync(Date.now());
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['medications'] });
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
    }

    if (failCount > 0) {
      toast.error(`${failCount} change${failCount > 1 ? 's' : ''} failed to sync`);
    }

    setPendingCount(await getPendingActions().then((p) => p.length));
    setSyncing(false);
  }, [syncing, queryClient]);

  // Process individual action
  const processAction = async (action: PendingAction): Promise<void> => {
    switch (action.type) {
      case 'medication_log':
        await api.post(
          `/medications/${action.payload.medicationId}/log`,
          action.payload.data
        );
        break;
      
      case 'timeline_entry':
        await api.post(
          `/care-recipients/${action.payload.careRecipientId}/timeline`,
          action.payload.data
        );
        break;
      
      case 'shift_checkin':
        await api.post(
          `/shifts/${action.payload.shiftId}/checkin`,
          action.payload.data
        );
        break;
      
      case 'shift_checkout':
        await api.post(
          `/shifts/${action.payload.shiftId}/checkout`,
          action.payload.data
        );
        break;
      
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  };

  // Manual sync trigger
  const sync = useCallback(async () => {
    if (!online) {
      toast.error('Cannot sync while offline');
      return;
    }
    await syncPendingActions();
  }, [online, syncPendingActions]);

  return {
    online,
    syncing,
    pendingCount,
    sync,
  };
}

