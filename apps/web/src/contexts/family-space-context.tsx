'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { UserFamily, CareRecipient } from '@/lib/api';

const STORAGE_KEY = 'family-space-selection';

interface FamilySpaceSelection {
  familyId: string | null;
  careRecipientId: string | null;
}

interface FamilySpaceContextValue {
  // Selected IDs
  selectedFamilyId: string | null;
  selectedCareRecipientId: string | null;

  // Full objects (derived from user data)
  selectedFamily: UserFamily | null;
  selectedCareRecipient: CareRecipient | null;

  // All families and care recipients for current user
  families: UserFamily[];
  careRecipients: CareRecipient[];

  // User's role in the selected family
  currentRole: 'ADMIN' | 'CAREGIVER' | 'VIEWER' | null;

  // Selection methods
  setSelectedFamily: (familyId: string | null) => void;
  setSelectedCareRecipient: (careRecipientId: string | null) => void;

  // Loading state
  isLoading: boolean;

  // Refresh method - force sync with server
  refreshFamilies: () => Promise<void>;
}

const FamilySpaceContext = createContext<FamilySpaceContextValue | null>(null);

export function FamilySpaceProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: authLoading, syncWithServer, refetchUser } = useAuth();
  const hasInitializedRef = useRef(false);
  const previousFamiliesRef = useRef<string[]>([]);

  // Load initial selection from localStorage
  const [selection, setSelection] = useState<FamilySpaceSelection>(() => {
    if (typeof window === 'undefined') {
      return { familyId: null, careRecipientId: null };
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Ignore parse errors
    }
    return { familyId: null, careRecipientId: null };
  });

  const families = user?.families ?? [];

  // Derive the selected family
  const selectedFamily = families.find(f => f.id === selection.familyId) ?? null;

  // Get care recipients for the selected family
  const careRecipients = selectedFamily?.careRecipients ?? [];

  // Derive the selected care recipient
  const selectedCareRecipient = careRecipients.find(
    cr => cr.id === selection.careRecipientId
  ) ?? null;

  // Get user's role in the selected family
  const currentRole = selectedFamily?.role ?? null;

  // Auto-sync on mount if user is authenticated but has no families
  // This handles the case where storage has auth data but family data wasn't loaded
  useEffect(() => {
    if (authLoading || !user || hasInitializedRef.current) return;
    
    hasInitializedRef.current = true;

    // If user is authenticated but has no families, try syncing with server
    // This handles stale data or cache issues
    if (user && families.length === 0) {
      console.log('FamilySpaceProvider - User has no families, attempting sync...');
      syncWithServer().catch(console.error);
    }
  }, [authLoading, user, families.length, syncWithServer]);

  // Track family changes and auto-sync when needed
  useEffect(() => {
    const currentFamilyIds = families.map(f => f.id).sort().join(',');
    const previousFamilyIds = previousFamiliesRef.current.sort().join(',');

    if (currentFamilyIds !== previousFamilyIds) {
      console.log('FamilySpaceProvider - Families changed:', {
        previous: previousFamiliesRef.current,
        current: families.map(f => ({ id: f.id, name: f.name })),
      });
      previousFamiliesRef.current = families.map(f => f.id);
    }
  }, [families]);

  // Auto-select first family and care recipient if none selected
  useEffect(() => {
    if (authLoading || !user) return;

    let newFamilyId = selection.familyId;
    let newCareRecipientId = selection.careRecipientId;
    let shouldUpdate = false;

    // If no family selected or selected family no longer exists, select first
    if (!newFamilyId || !families.find(f => f.id === newFamilyId)) {
      if (families.length > 0) {
        newFamilyId = families[0].id;
        newCareRecipientId = null; // Reset care recipient when family changes
        shouldUpdate = true;
      } else {
        newFamilyId = null;
        newCareRecipientId = null;
        shouldUpdate = selection.familyId !== null || selection.careRecipientId !== null;
      }
    }

    // Get care recipients for the (possibly new) family
    const familyCareRecipients = families.find(f => f.id === newFamilyId)?.careRecipients ?? [];

    // If no care recipient selected or selected care recipient no longer exists, select first
    if (!newCareRecipientId || !familyCareRecipients.find(cr => cr.id === newCareRecipientId)) {
      if (familyCareRecipients.length > 0) {
        newCareRecipientId = familyCareRecipients[0].id;
        shouldUpdate = true;
      } else {
        newCareRecipientId = null;
        shouldUpdate = shouldUpdate || selection.careRecipientId !== null;
      }
    }

    if (shouldUpdate) {
      setSelection({ familyId: newFamilyId, careRecipientId: newCareRecipientId });
    }
  }, [authLoading, user, families, selection.familyId, selection.careRecipientId]);

  // Persist selection to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selection));
  }, [selection]);

  const setSelectedFamily = useCallback((familyId: string | null) => {
    // When family changes, reset care recipient to first in new family
    const newFamily = families.find(f => f.id === familyId);
    const newCareRecipientId = newFamily?.careRecipients?.[0]?.id ?? null;

    setSelection({
      familyId,
      careRecipientId: newCareRecipientId,
    });
  }, [families]);

  const setSelectedCareRecipient = useCallback((careRecipientId: string | null) => {
    setSelection(prev => ({
      ...prev,
      careRecipientId,
    }));
  }, []);

  // Refresh families from server - use this when you expect family data to have changed
  const refreshFamilies = useCallback(async () => {
    console.log('FamilySpaceProvider - Refreshing families from server...');
    try {
      await syncWithServer();
      console.log('FamilySpaceProvider - Families refreshed successfully');
    } catch (error) {
      console.error('FamilySpaceProvider - Failed to refresh families:', error);
      // Fall back to simple refetch
      await refetchUser();
    }
  }, [syncWithServer, refetchUser]);

  const value: FamilySpaceContextValue = {
    selectedFamilyId: selection.familyId,
    selectedCareRecipientId: selection.careRecipientId,
    selectedFamily,
    selectedCareRecipient,
    families,
    careRecipients,
    currentRole,
    setSelectedFamily,
    setSelectedCareRecipient,
    isLoading: authLoading,
    refreshFamilies,
  };

  return (
    <FamilySpaceContext.Provider value={value}>
      {children}
    </FamilySpaceContext.Provider>
  );
}

export function useFamilySpace() {
  const context = useContext(FamilySpaceContext);
  if (!context) {
    throw new Error('useFamilySpace must be used within a FamilySpaceProvider');
  }
  return context;
}
