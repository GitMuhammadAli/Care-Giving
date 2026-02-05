'use client';

import { memo } from 'react';

// Generic page loading skeleton
export const PageSkeleton = memo(function PageSkeleton() {
  return (
    <div className="animate-pulse p-6 space-y-6">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-8 bg-sage-100 rounded-lg w-48" />
        <div className="h-4 bg-sage-100 rounded w-64" />
      </div>

      {/* Content skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-sage-100" />
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-sage-100 rounded w-3/4" />
                <div className="h-3 bg-sage-100 rounded w-1/2" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-sage-100 rounded w-full" />
              <div className="h-3 bg-sage-100 rounded w-5/6" />
            </div>
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="h-12 bg-sage-50 border-b border-border" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4 p-4 border-b border-border last:border-0">
            <div className="w-8 h-8 rounded-full bg-sage-100" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-sage-100 rounded w-1/3" />
              <div className="h-3 bg-sage-100 rounded w-1/4" />
            </div>
            <div className="h-8 w-20 bg-sage-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
});

// Dashboard loading skeleton
export const DashboardSkeleton = memo(function DashboardSkeleton() {
  return (
    <div className="animate-pulse p-6 space-y-6">
      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-4 bg-sage-100 rounded w-24" />
                <div className="h-8 bg-sage-100 rounded w-16" />
              </div>
              <div className="w-10 h-10 rounded-full bg-sage-100" />
            </div>
          </div>
        ))}
      </div>

      {/* Main content area */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="h-6 bg-sage-100 rounded w-32" />
          <div className="h-64 bg-sage-50 rounded-lg" />
        </div>
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="h-6 bg-sage-100 rounded w-28" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-sage-50 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-sage-100" />
              <div className="flex-1 space-y-1">
                <div className="h-3 bg-sage-100 rounded w-3/4" />
                <div className="h-2 bg-sage-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

// List page loading skeleton
export const ListSkeleton = memo(function ListSkeleton() {
  return (
    <div className="animate-pulse p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 bg-sage-100 rounded w-40" />
          <div className="h-4 bg-sage-100 rounded w-56" />
        </div>
        <div className="h-10 w-32 bg-sage-100 rounded-lg" />
      </div>

      {/* Search bar */}
      <div className="h-12 bg-sage-50 rounded-xl" />

      {/* List items */}
      <div className="space-y-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-sage-100" />
            <div className="flex-1 space-y-2">
              <div className="h-5 bg-sage-100 rounded w-1/3" />
              <div className="h-3 bg-sage-100 rounded w-1/2" />
            </div>
            <div className="flex gap-2">
              <div className="h-8 w-8 rounded-lg bg-sage-100" />
              <div className="h-8 w-8 rounded-lg bg-sage-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

// Admin page loading skeleton
export const AdminSkeleton = memo(function AdminSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Page title */}
      <div>
        <div className="h-8 bg-sage-100 rounded w-48 mb-2" />
        <div className="h-4 bg-sage-100 rounded w-72" />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="dashboard-card">
            <div className="h-4 bg-sage-100 rounded w-20 mb-2" />
            <div className="h-8 bg-sage-100 rounded w-12" />
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="dashboard-card !p-0 overflow-hidden">
        <div className="h-12 bg-sage-50 border-b border-sage-200" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-sage-100 last:border-0">
            <div className="w-10 h-10 rounded-full bg-sage-100" />
            <div className="flex-1 space-y-1">
              <div className="h-4 bg-sage-100 rounded w-1/4" />
              <div className="h-3 bg-sage-100 rounded w-1/3" />
            </div>
            <div className="h-6 w-16 bg-sage-100 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
});

// Simple spinner
export const Spinner = memo(function Spinner({ 
  size = 'md' 
}: { 
  size?: 'sm' | 'md' | 'lg' 
}) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className={`${sizeClasses[size]} animate-spin rounded-full border-2 border-sage-200 border-t-sage`} />
  );
});

// Full page loading
export const FullPageLoading = memo(function FullPageLoading() {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-4">
        <Spinner size="lg" />
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    </div>
  );
});

