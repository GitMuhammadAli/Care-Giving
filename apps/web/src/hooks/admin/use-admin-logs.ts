'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, type LogFilter, type LogLevel } from '@/lib/api/admin';
import toast from 'react-hot-toast';
import { useState } from 'react';

/**
 * Hook for fetching paginated logs with filtering
 */
export function useLogs(initialFilter: LogFilter = {}) {
  const [filter, setFilter] = useState<LogFilter>({
    page: 1,
    limit: 50,
    ...initialFilter,
  });

  const query = useQuery({
    queryKey: ['admin', 'logs', filter],
    queryFn: () => adminApi.getLogs(filter),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refresh every minute
  });

  const updateFilter = (newFilter: Partial<LogFilter>) => {
    setFilter((prev) => ({ ...prev, ...newFilter, page: 1 }));
  };

  const setPage = (page: number) => {
    setFilter((prev) => ({ ...prev, page }));
  };

  const resetFilter = () => {
    setFilter({ page: 1, limit: 50 });
  };

  return {
    ...query,
    filter,
    updateFilter,
    setPage,
    resetFilter,
  };
}

/**
 * Hook for fetching log statistics
 */
export function useLogStats(hours: number = 24) {
  return useQuery({
    queryKey: ['admin', 'logs', 'stats', hours],
    queryFn: () => adminApi.getLogStats(hours),
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });
}

/**
 * Hook for fetching recent errors
 */
export function useRecentErrors(limit: number = 10) {
  return useQuery({
    queryKey: ['admin', 'logs', 'errors', limit],
    queryFn: () => adminApi.getRecentErrors(limit),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refresh every minute
  });
}

/**
 * Hook for fetching the complete log dashboard data
 */
export function useLogDashboard() {
  return useQuery({
    queryKey: ['admin', 'logs', 'dashboard'],
    queryFn: () => adminApi.getLogDashboard(),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refresh every minute
  });
}

/**
 * Hook for fetching available services
 */
export function useLogServices() {
  return useQuery({
    queryKey: ['admin', 'logs', 'services'],
    queryFn: () => adminApi.getLogServices(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for fetching available log levels
 */
export function useLogLevels() {
  return useQuery({
    queryKey: ['admin', 'logs', 'levels'],
    queryFn: () => adminApi.getLogLevels(),
    staleTime: 60 * 60 * 1000, // 1 hour - rarely changes
  });
}

/**
 * Hook for cleaning up old logs
 */
export function useCleanupLogs() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (days: number) => adminApi.cleanupLogs(days),
    onSuccess: (data) => {
      toast.success(data.message);
      // Invalidate all log queries
      queryClient.invalidateQueries({ queryKey: ['admin', 'logs'] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to cleanup logs');
    },
  });
}

/**
 * Get log level color for badges
 */
export function getLogLevelColor(level: LogLevel): string {
  switch (level) {
    case 'DEBUG':
      return 'bg-muted text-muted-foreground';
    case 'INFO':
      return 'bg-blue-100 text-blue-700';
    case 'WARN':
      return 'bg-amber-100 text-amber-700';
    case 'ERROR':
      return 'bg-destructive/10 text-destructive';
    case 'FATAL':
      return 'bg-destructive text-white';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

/**
 * Get service category (Server, DB, Client) based on service name
 */
export function getServiceCategory(service?: string): 'server' | 'database' | 'client' {
  if (!service) return 'server';
  
  const serviceLower = service.toLowerCase();
  
  if (
    serviceLower.includes('prisma') ||
    serviceLower.includes('database') ||
    serviceLower.includes('db') ||
    serviceLower.includes('sql')
  ) {
    return 'database';
  }
  
  if (
    serviceLower.includes('client') ||
    serviceLower.includes('frontend') ||
    serviceLower.includes('browser')
  ) {
    return 'client';
  }
  
  return 'server';
}

