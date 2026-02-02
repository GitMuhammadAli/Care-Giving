'use client';

import { useSystemHealth, useSystemStats } from '@/hooks/admin';
import { Badge } from '@/components/ui/badge';
import { 
  Server, 
  Database, 
  Clock, 
  Cpu, 
  HardDrive, 
  Users, 
  Home, 
  Heart,
  FileText,
  Shield
} from 'lucide-react';

export default function AdminSettingsPage() {
  const { data: health, isLoading: loadingHealth } = useSystemHealth();
  const { data: stats, isLoading: loadingStats } = useSystemStats();

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">System Settings</h1>
        <p className="text-slate-400 mt-1">
          Monitor system health and configuration
        </p>
      </div>

      {/* System Health */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">System Health</h2>
        {loadingHealth ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
          </div>
        ) : (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${
                  health?.status === 'healthy' ? 'bg-emerald-500' : 'bg-amber-500'
                }`} />
                <span className="text-lg font-medium text-white">
                  System Status: {health?.status === 'healthy' ? 'Healthy' : 'Degraded'}
                </span>
              </div>
              <Badge className="bg-slate-700 text-slate-300">
                v{health?.version || '1.0.0'}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-700/30 rounded-lg p-4">
                <div className="flex items-center gap-2 text-slate-400 mb-2">
                  <Server className="w-4 h-4" />
                  <span className="text-sm">Environment</span>
                </div>
                <p className="text-lg font-medium text-white capitalize">
                  {health?.environment || 'development'}
                </p>
              </div>

              <div className="bg-slate-700/30 rounded-lg p-4">
                <div className="flex items-center gap-2 text-slate-400 mb-2">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">Uptime</span>
                </div>
                <p className="text-lg font-medium text-white">
                  {health?.uptime ? formatUptime(health.uptime) : '-'}
                </p>
              </div>

              <div className="bg-slate-700/30 rounded-lg p-4">
                <div className="flex items-center gap-2 text-slate-400 mb-2">
                  <Database className="w-4 h-4" />
                  <span className="text-sm">Database</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    health?.database?.status === 'healthy' ? 'bg-emerald-500' : 'bg-red-500'
                  }`} />
                  <p className="text-lg font-medium text-white">
                    {health?.database?.latency || '-'}
                  </p>
                </div>
              </div>

              <div className="bg-slate-700/30 rounded-lg p-4">
                <div className="flex items-center gap-2 text-slate-400 mb-2">
                  <Cpu className="w-4 h-4" />
                  <span className="text-sm">Response Time</span>
                </div>
                <p className="text-lg font-medium text-white">
                  {health?.responseTime || '-'}
                </p>
              </div>
            </div>

            {/* Memory Usage */}
            {health?.memory && (
              <div className="mt-6 pt-6 border-t border-slate-700">
                <h3 className="text-sm font-medium text-slate-400 mb-3">Memory Usage</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-slate-400">Heap Used</p>
                    <p className="text-lg font-medium text-white">{health.memory.heapUsed}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Heap Total</p>
                    <p className="text-lg font-medium text-white">{health.memory.heapTotal}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">RSS</p>
                    <p className="text-lg font-medium text-white">{health.memory.rss}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* System Statistics */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">System Statistics</h2>
        {loadingStats ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Users */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-blue-400" />
                <h3 className="text-md font-semibold text-white">Users</h3>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-2xl font-bold text-white">{stats?.users?.total || 0}</p>
                  <p className="text-sm text-slate-400">Total</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-400">{stats?.users?.active || 0}</p>
                  <p className="text-sm text-slate-400">Active</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-400">{stats?.users?.suspended || 0}</p>
                  <p className="text-sm text-slate-400">Suspended</p>
                </div>
              </div>
              {stats?.users?.byRole && (
                <div className="mt-4 pt-4 border-t border-slate-700">
                  <p className="text-sm text-slate-400 mb-2">By Role</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(stats.users.byRole).map(([role, count]) => (
                      <Badge key={role} className="bg-slate-700 text-slate-300">
                        {role}: {count as number}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-purple-400" />
                <h3 className="text-md font-semibold text-white">Content</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Home className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-300">Families</span>
                  </div>
                  <span className="text-white font-medium">{stats?.families?.total || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-300">Care Recipients</span>
                  </div>
                  <span className="text-white font-medium">{stats?.careRecipients?.total || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-300">Appointments</span>
                  </div>
                  <span className="text-white font-medium">{stats?.content?.appointments || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-300">Medications</span>
                  </div>
                  <span className="text-white font-medium">{stats?.content?.medications || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-300">Documents</span>
                  </div>
                  <span className="text-white font-medium">{stats?.content?.documents || 0}</span>
                </div>
              </div>
            </div>

            {/* Audit */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-emerald-400" />
                <h3 className="text-md font-semibold text-white">Audit</h3>
              </div>
              <p className="text-3xl font-bold text-white">{stats?.audit?.totalLogs || 0}</p>
              <p className="text-sm text-slate-400">Total Audit Log Entries</p>
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

