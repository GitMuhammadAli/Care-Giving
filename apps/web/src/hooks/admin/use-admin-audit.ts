'use client';

import { useQuery } from '@tanstack/react-query';
import { adminApi, AuditLogFilter } from '@/lib/api/admin';

export function useAuditLogs(filter: AuditLogFilter = {}) {
  return useQuery({
    queryKey: ['admin', 'audit', 'logs', filter],
    queryFn: () => adminApi.getAuditLogs(filter),
  });
}

export function useUserAuditTrail(userId: string) {
  return useQuery({
    queryKey: ['admin', 'audit', 'user', userId],
    queryFn: () => adminApi.getUserAuditTrail(userId),
    enabled: !!userId,
  });
}

export function useSecurityEvents() {
  return useQuery({
    queryKey: ['admin', 'audit', 'security-events'],
    queryFn: () => adminApi.getSecurityEvents(),
  });
}

export function useLoginAttempts(days: number = 7) {
  return useQuery({
    queryKey: ['admin', 'audit', 'login-attempts', days],
    queryFn: () => adminApi.getLoginAttempts(days),
  });
}

export function useAdminActions() {
  return useQuery({
    queryKey: ['admin', 'audit', 'admin-actions'],
    queryFn: () => adminApi.getAdminActions(),
  });
}

