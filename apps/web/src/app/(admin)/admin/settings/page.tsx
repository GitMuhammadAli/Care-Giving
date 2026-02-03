'use client';

import { useSystemHealth, useSystemStats } from '@/hooks/admin';
import { 
  Server, 
  Database, 
  Clock, 
  Cpu, 
  Users, 
  Home, 
  Heart,
  FileText,
  Shield,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AdminSettingsPage() {
  const { data: health, isLoading: loadingHealth } = useSystemHealth();
  const { data: stats, isLoading: loadingStats } = useSystemStats();

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="font-editorial text-3xl text-foreground">System Settings</h1>
        <p className="text-muted-foreground mt-1">
          Monitor system health and configuration
        </p>
      </div>

      {/* System Health */}
      <section>
        <h2 className="font-editorial text-xl text-foreground mb-4">System Health</h2>
        {loadingHealth ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sage" />
          </div>
        ) : (
          <div className="dashboard-card">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-3 h-3 rounded-full',
                  health?.status === 'healthy' ? 'bg-sage' : 'bg-warning'
                )} />
                <span className="text-lg font-medium text-foreground">
                  System Status: {health?.status === 'healthy' ? 'Healthy' : 'Degraded'}
                </span>
              </div>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-sage-100 text-sage">
                v{health?.version || '1.0.0'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-sage-50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Server className="w-4 h-4" />
                  <span className="text-sm">Environment</span>
                </div>
                <p className="text-lg font-medium text-foreground capitalize">
                  {health?.environment || 'development'}
                </p>
              </div>

              <div className="bg-sage-50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">Uptime</span>
                </div>
                <p className="text-lg font-medium text-foreground">
                  {health?.uptime ? formatUptime(health.uptime) : '-'}
                </p>
              </div>

              <div className="bg-sage-50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Database className="w-4 h-4" />
                  <span className="text-sm">Database</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={cn(
                    'w-2 h-2 rounded-full',
                    health?.database?.status === 'healthy' ? 'bg-sage' : 'bg-destructive'
                  )} />
                  <p className="text-lg font-medium text-foreground">
                    {health?.database?.latency || '-'}
                  </p>
                </div>
              </div>

              <div className="bg-sage-50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Cpu className="w-4 h-4" />
                  <span className="text-sm">Response Time</span>
                </div>
                <p className="text-lg font-medium text-foreground">
                  {health?.responseTime || '-'}
                </p>
              </div>
            </div>

            {/* Memory Usage */}
            {health?.memory && (
              <div className="mt-6 pt-6 border-t border-sage-200">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Memory Usage</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Heap Used</p>
                    <p className="text-lg font-medium text-foreground">{health.memory.heapUsed}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Heap Total</p>
                    <p className="text-lg font-medium text-foreground">{health.memory.heapTotal}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">RSS</p>
                    <p className="text-lg font-medium text-foreground">{health.memory.rss}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* System Statistics */}
      <section>
        <h2 className="font-editorial text-xl text-foreground mb-4">System Statistics</h2>
        {loadingStats ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sage" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Users */}
            <div className="dashboard-card">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-sage" />
                <h3 className="font-medium text-foreground">Users</h3>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-2xl font-editorial text-foreground">{stats?.users?.total || 0}</p>
                  <p className="text-sm text-muted-foreground">Total</p>
                </div>
                <div>
                  <p className="text-2xl font-editorial text-sage">{stats?.users?.active || 0}</p>
                  <p className="text-sm text-muted-foreground">Active</p>
                </div>
                <div>
                  <p className="text-2xl font-editorial text-destructive">{stats?.users?.suspended || 0}</p>
                  <p className="text-sm text-muted-foreground">Suspended</p>
                </div>
              </div>
              {stats?.users?.byRole && (
                <div className="mt-4 pt-4 border-t border-sage-200">
                  <p className="text-sm text-muted-foreground mb-2">By Role</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(stats.users.byRole).map(([role, count]) => (
                      <span key={role} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-sage-100 text-sage-700">
                        {role}: {count as number}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="dashboard-card">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-terracotta" />
                <h3 className="font-medium text-foreground">Content</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Home className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Families</span>
                  </div>
                  <span className="text-foreground font-medium">{stats?.families?.total || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Care Recipients</span>
                  </div>
                  <span className="text-foreground font-medium">{stats?.careRecipients?.total || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Appointments</span>
                  </div>
                  <span className="text-foreground font-medium">{stats?.content?.appointments || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Medications</span>
                  </div>
                  <span className="text-foreground font-medium">{stats?.content?.medications || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Documents</span>
                  </div>
                  <span className="text-foreground font-medium">{stats?.content?.documents || 0}</span>
                </div>
              </div>
            </div>

            {/* Audit */}
            <div className="dashboard-card">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-sage" />
                <h3 className="font-medium text-foreground">Audit</h3>
              </div>
              <p className="text-3xl font-editorial text-foreground">{stats?.audit?.totalLogs || 0}</p>
              <p className="text-sm text-muted-foreground">Total Audit Log Entries</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
