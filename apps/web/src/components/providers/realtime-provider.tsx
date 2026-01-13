'use client';

import { createContext, useContext, useEffect, ReactNode } from 'react';
import { useWebSocket } from '@/hooks/use-websocket';
import { useOfflineSync } from '@/hooks/use-offline-sync';

interface RealtimeContextValue {
  isConnected: boolean;
  online: boolean;
  syncing: boolean;
  pendingCount: number;
}

const RealtimeContext = createContext<RealtimeContextValue>({
  isConnected: false,
  online: true,
  syncing: false,
  pendingCount: 0,
});

export function useRealtime() {
  return useContext(RealtimeContext);
}

interface Props {
  children: ReactNode;
  familyId?: string;
}

export function RealtimeProvider({ children, familyId }: Props) {
  const { isConnected } = useWebSocket(familyId);
  const { online, syncing, pendingCount, sync } = useOfflineSync();

  // Auto-sync when coming back online
  useEffect(() => {
    if (online && pendingCount > 0) {
      sync();
    }
  }, [online, pendingCount, sync]);

  // Listen for sync messages from service worker
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SYNC_OFFLINE_ACTIONS') {
        sync();
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleMessage);
      return () => {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      };
    }
  }, [sync]);

  return (
    <RealtimeContext.Provider value={{ isConnected, online, syncing, pendingCount }}>
      {children}
    </RealtimeContext.Provider>
  );
}

