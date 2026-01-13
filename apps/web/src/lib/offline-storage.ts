import localforage from 'localforage';

// Configure localforage
localforage.config({
  name: 'CareCircle',
  storeName: 'carecircle_store',
  description: 'CareCircle offline storage',
});

// Storage keys
const KEYS = {
  EMERGENCY_INFO: 'emergency_info',
  MEDICATIONS: 'medications',
  APPOINTMENTS: 'appointments',
  CARE_RECIPIENTS: 'care_recipients',
  PENDING_ACTIONS: 'pending_actions',
  USER: 'user',
  FAMILY: 'family',
  LAST_SYNC: 'last_sync',
};

// Types
export interface PendingAction {
  id: string;
  type: 'medication_log' | 'timeline_entry' | 'shift_checkin' | 'shift_checkout';
  payload: any;
  createdAt: number;
  retryCount: number;
}

// ==================== Emergency Info (Critical - always cached) ====================

export async function cacheEmergencyInfo(careRecipientId: string, data: any): Promise<void> {
  const key = `${KEYS.EMERGENCY_INFO}:${careRecipientId}`;
  await localforage.setItem(key, {
    data,
    cachedAt: Date.now(),
  });
}

export async function getEmergencyInfo(careRecipientId: string): Promise<any | null> {
  const key = `${KEYS.EMERGENCY_INFO}:${careRecipientId}`;
  const cached = await localforage.getItem<{ data: any; cachedAt: number }>(key);
  return cached?.data || null;
}

// ==================== Medications ====================

export async function cacheMedications(careRecipientId: string, data: any[]): Promise<void> {
  const key = `${KEYS.MEDICATIONS}:${careRecipientId}`;
  await localforage.setItem(key, {
    data,
    cachedAt: Date.now(),
  });
}

export async function getMedications(careRecipientId: string): Promise<any[] | null> {
  const key = `${KEYS.MEDICATIONS}:${careRecipientId}`;
  const cached = await localforage.getItem<{ data: any[]; cachedAt: number }>(key);
  return cached?.data || null;
}

// ==================== Appointments ====================

export async function cacheAppointments(careRecipientId: string, data: any[]): Promise<void> {
  const key = `${KEYS.APPOINTMENTS}:${careRecipientId}`;
  await localforage.setItem(key, {
    data,
    cachedAt: Date.now(),
  });
}

export async function getAppointments(careRecipientId: string): Promise<any[] | null> {
  const key = `${KEYS.APPOINTMENTS}:${careRecipientId}`;
  const cached = await localforage.getItem<{ data: any[]; cachedAt: number }>(key);
  return cached?.data || null;
}

// ==================== Care Recipients ====================

export async function cacheCareRecipients(familyId: string, data: any[]): Promise<void> {
  const key = `${KEYS.CARE_RECIPIENTS}:${familyId}`;
  await localforage.setItem(key, {
    data,
    cachedAt: Date.now(),
  });
}

export async function getCareRecipients(familyId: string): Promise<any[] | null> {
  const key = `${KEYS.CARE_RECIPIENTS}:${familyId}`;
  const cached = await localforage.getItem<{ data: any[]; cachedAt: number }>(key);
  return cached?.data || null;
}

// ==================== User & Family ====================

export async function cacheUser(user: any): Promise<void> {
  await localforage.setItem(KEYS.USER, user);
}

export async function getUser(): Promise<any | null> {
  return localforage.getItem(KEYS.USER);
}

export async function cacheFamily(family: any): Promise<void> {
  await localforage.setItem(KEYS.FAMILY, family);
}

export async function getFamily(): Promise<any | null> {
  return localforage.getItem(KEYS.FAMILY);
}

// ==================== Pending Actions (Offline Queue) ====================

export async function queueAction(action: Omit<PendingAction, 'id' | 'createdAt' | 'retryCount'>): Promise<void> {
  const pending = await getPendingActions();
  const newAction: PendingAction = {
    ...action,
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: Date.now(),
    retryCount: 0,
  };
  pending.push(newAction);
  await localforage.setItem(KEYS.PENDING_ACTIONS, pending);
}

export async function getPendingActions(): Promise<PendingAction[]> {
  return (await localforage.getItem<PendingAction[]>(KEYS.PENDING_ACTIONS)) || [];
}

export async function removePendingAction(id: string): Promise<void> {
  const pending = await getPendingActions();
  const filtered = pending.filter((a) => a.id !== id);
  await localforage.setItem(KEYS.PENDING_ACTIONS, filtered);
}

export async function updatePendingAction(id: string, updates: Partial<PendingAction>): Promise<void> {
  const pending = await getPendingActions();
  const index = pending.findIndex((a) => a.id === id);
  if (index !== -1) {
    pending[index] = { ...pending[index], ...updates };
    await localforage.setItem(KEYS.PENDING_ACTIONS, pending);
  }
}

export async function clearPendingActions(): Promise<void> {
  await localforage.setItem(KEYS.PENDING_ACTIONS, []);
}

// ==================== Sync Management ====================

export async function setLastSync(timestamp: number): Promise<void> {
  await localforage.setItem(KEYS.LAST_SYNC, timestamp);
}

export async function getLastSync(): Promise<number | null> {
  return localforage.getItem(KEYS.LAST_SYNC);
}

// ==================== Clear All Data ====================

export async function clearAllOfflineData(): Promise<void> {
  await localforage.clear();
}

// ==================== Check Online Status ====================

export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

export function onOnlineStatusChange(callback: (isOnline: boolean) => void): () => void {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}
