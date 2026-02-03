'use client';

import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';

export function useAdminOverview() {
  return useQuery({
    queryKey: ['admin', 'analytics', 'overview'],
    queryFn: () => adminApi.getOverview(),
    refetchInterval: 60000, // Refresh every minute
  });
}

export function useUserMetrics(days: number = 30) {
  return useQuery({
    queryKey: ['admin', 'analytics', 'users', days],
    queryFn: () => adminApi.getUserMetrics(days),
  });
}

export function useFamilyMetrics(days: number = 30) {
  return useQuery({
    queryKey: ['admin', 'analytics', 'families', days],
    queryFn: () => adminApi.getFamilyMetrics(days),
  });
}

export function useUsageMetrics() {
  return useQuery({
    queryKey: ['admin', 'analytics', 'usage'],
    queryFn: () => adminApi.getUsageMetrics(),
  });
}

export function useSystemHealth() {
  return useQuery({
    queryKey: ['admin', 'system', 'health'],
    queryFn: () => adminApi.getSystemHealth(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useSystemStats() {
  return useQuery({
    queryKey: ['admin', 'system', 'stats'],
    queryFn: () => adminApi.getSystemStats(),
  });
}

export function useResourceUsage() {
  return useQuery({
    queryKey: ['admin', 'system', 'resource-usage'],
    queryFn: () => adminApi.getResourceUsage(),
    refetchInterval: 60000, // Refresh every minute
  });
}

export function useUsageSummary() {
  return useQuery({
    queryKey: ['admin', 'system', 'usage-summary'],
    queryFn: () => adminApi.getUsageSummary(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

