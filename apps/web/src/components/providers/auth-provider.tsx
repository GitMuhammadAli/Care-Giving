'use client';

import { createContext, useContext, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { User } from '@/lib/api';

// Auth context types
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  hasRole: (familyId: string, role: 'ADMIN' | 'CAREGIVER' | 'VIEWER') => boolean;
  hasAnyRole: (familyId: string, roles: Array<'ADMIN' | 'CAREGIVER' | 'VIEWER'>) => boolean;
  isAdmin: (familyId?: string) => boolean;
  canManageFamily: (familyId: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * AuthProvider - Centralized authentication provider for the entire app
 *
 * This provider:
 * - Initializes auth state on app mount (attempts to restore session from httpOnly cookie)
 * - Provides auth state and helper methods to all child components
 * - Handles session restoration once and shares state across all routes
 * - Uses zustand's sessionChecked flag to prevent duplicate refresh API calls
 */
export function AuthProvider({ children }: AuthProviderProps) {
  // Use sessionChecked from zustand store as the initialization flag
  // This prevents duplicate API calls across React's Strict Mode re-renders
  const { user, isAuthenticated, isLoading, fetchUser, sessionChecked } = useAuth();

  // Initialize auth on mount - uses zustand's sessionChecked to prevent duplicate calls
  useEffect(() => {
    // fetchUser internally checks sessionChecked and skips if already checked
    fetchUser();
  }, [fetchUser]);

  // Helper: Check if user has specific role in a family
  const hasRole = useCallback((familyId: string, role: 'ADMIN' | 'CAREGIVER' | 'VIEWER'): boolean => {
    if (!user || !user.families) return false;
    
    const family = user.families.find(f => f.id === familyId);
    if (!family) return false;
    
    // Check if there's a role property on the family membership
    return family.role === role;
  }, [user]);

  // Helper: Check if user has any of the specified roles
  const hasAnyRole = useCallback((familyId: string, roles: Array<'ADMIN' | 'CAREGIVER' | 'VIEWER'>): boolean => {
    return roles.some(role => hasRole(familyId, role));
  }, [hasRole]);

  // Helper: Check if user is admin of any family (or specific family)
  const isAdmin = useCallback((familyId?: string): boolean => {
    if (!user || !user.families) return false;
    
    if (familyId) {
      return hasRole(familyId, 'ADMIN');
    }
    
    // Check if admin of any family
    return user.families.some(f => f.role === 'ADMIN');
  }, [user, hasRole]);

  // Helper: Check if user can manage family (admin or caregiver)
  const canManageFamily = useCallback((familyId: string): boolean => {
    return hasAnyRole(familyId, ['ADMIN', 'CAREGIVER']);
  }, [hasAnyRole]);

  const contextValue: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    isInitialized: sessionChecked, // Use zustand's sessionChecked as the initialization flag
    hasRole,
    hasAnyRole,
    isAdmin,
    canManageFamily,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access auth context
 * Must be used within AuthProvider
 */
export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}

