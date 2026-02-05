'use client';

import { useQuery } from '@tanstack/react-query';
import { adminApi, EmailLogFilter, AuthLogFilter, CronLogFilter } from '@/lib/api/admin';

// Dashboard hook - gets everything at once
export function useMonitoringDashboard(hours: number = 24) {
  return useQuery({
    queryKey: ['admin', 'monitoring', 'dashboard', hours],
    queryFn: () => adminApi.getMonitoringDashboard(hours),
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

// Time series hooks
export function useRequestTimeSeries(hours: number = 24) {
  return useQuery({
    queryKey: ['admin', 'monitoring', 'requests', 'timeseries', hours],
    queryFn: () => adminApi.getRequestTimeSeries(hours),
    refetchInterval: 60000,
  });
}

export function useErrorTimeSeries(hours: number = 24) {
  return useQuery({
    queryKey: ['admin', 'monitoring', 'errors', 'timeseries', hours],
    queryFn: () => adminApi.getErrorTimeSeries(hours),
    refetchInterval: 60000,
  });
}

export function useResponseTimeStats(hours: number = 24) {
  return useQuery({
    queryKey: ['admin', 'monitoring', 'response-times', hours],
    queryFn: () => adminApi.getResponseTimeStats(hours),
    refetchInterval: 60000,
  });
}

// Email hooks
export function useEmailLogs(filter: EmailLogFilter = {}) {
  return useQuery({
    queryKey: ['admin', 'monitoring', 'emails', filter],
    queryFn: () => adminApi.getEmailLogs(filter),
  });
}

export function useEmailStats(hours: number = 24) {
  return useQuery({
    queryKey: ['admin', 'monitoring', 'emails', 'stats', hours],
    queryFn: () => adminApi.getEmailStats(hours),
    refetchInterval: 60000,
  });
}

export function useEmailTimeSeries(hours: number = 24) {
  return useQuery({
    queryKey: ['admin', 'monitoring', 'emails', 'timeseries', hours],
    queryFn: () => adminApi.getEmailTimeSeries(hours),
    refetchInterval: 60000,
  });
}

// Auth hooks
export function useAuthLogs(filter: AuthLogFilter = {}) {
  return useQuery({
    queryKey: ['admin', 'monitoring', 'auth', filter],
    queryFn: () => adminApi.getAuthLogs(filter),
  });
}

export function useAuthStats(hours: number = 24) {
  return useQuery({
    queryKey: ['admin', 'monitoring', 'auth', 'stats', hours],
    queryFn: () => adminApi.getAuthStats(hours),
    refetchInterval: 60000,
  });
}

export function useAuthTimeSeries(hours: number = 24) {
  return useQuery({
    queryKey: ['admin', 'monitoring', 'auth', 'timeseries', hours],
    queryFn: () => adminApi.getAuthTimeSeries(hours),
    refetchInterval: 60000,
  });
}

// Cron hooks
export function useCronLogs(filter: CronLogFilter = {}) {
  return useQuery({
    queryKey: ['admin', 'monitoring', 'cron', filter],
    queryFn: () => adminApi.getCronLogs(filter),
  });
}

export function useCronStats(hours: number = 24) {
  return useQuery({
    queryKey: ['admin', 'monitoring', 'cron', 'stats', hours],
    queryFn: () => adminApi.getCronStats(hours),
    refetchInterval: 60000,
  });
}

export function useCronTimeSeries(hours: number = 24) {
  return useQuery({
    queryKey: ['admin', 'monitoring', 'cron', 'timeseries', hours],
    queryFn: () => adminApi.getCronTimeSeries(hours),
    refetchInterval: 60000,
  });
}

export function useCronJobNames() {
  return useQuery({
    queryKey: ['admin', 'monitoring', 'cron', 'jobs'],
    queryFn: () => adminApi.getCronJobNames(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Realtime hooks
export function useRealtimeStats() {
  return useQuery({
    queryKey: ['admin', 'monitoring', 'realtime'],
    queryFn: () => adminApi.getRealtimeStats(),
    refetchInterval: 5000, // Refresh every 5 seconds for real-time feel
  });
}

