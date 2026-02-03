'use client';

import { useState } from 'react';
import { useAuditLogs, useSecurityEvents, useLoginAttempts } from '@/hooks/admin';
import { DataTable } from '@/components/admin';
import { Shield, AlertTriangle, Lock, Activity } from 'lucide-react';
import { AuditLog, AuditLogFilter } from '@/lib/api/admin';
import { cn } from '@/lib/utils';

export default function AdminAuditPage() {
  const [filter, setFilter] = useState<AuditLogFilter>({ page: 1, limit: 50 });
  const [activeTab, setActiveTab] = useState<'all' | 'security' | 'logins'>('all');

  const { data: logs, isLoading: loadingLogs } = useAuditLogs(filter);
  const { data: securityEvents, isLoading: loadingSecurity } = useSecurityEvents();
  const { data: loginAttempts, isLoading: loadingLogins } = useLoginAttempts(7);

  const handlePageChange = (page: number) => {
    setFilter((prev) => ({ ...prev, page }));
  };

  const handleSearch = (search: string) => {
    setFilter((prev) => ({ ...prev, action: search, page: 1 }));
  };

  const columns = [
    {
      key: 'timestamp',
      header: 'Time',
      render: (log: AuditLog) => (
        <span className="text-muted-foreground text-sm">
          {new Date(log.timestamp).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'user',
      header: 'User',
      render: (log: AuditLog) => (
        <div>
          {log.user ? (
            <>
              <p className="text-foreground text-sm">{log.user.fullName}</p>
              <p className="text-muted-foreground text-xs">{log.user.email}</p>
            </>
          ) : (
            <span className="text-muted-foreground text-sm">System</span>
          )}
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      render: (log: AuditLog) => (
        <span className="text-foreground font-medium">{log.action}</span>
      ),
    },
    {
      key: 'resource',
      header: 'Resource',
      render: (log: AuditLog) => (
        <div>
          <span className="text-foreground text-sm">{log.resource || '-'}</span>
          {log.resourceId && (
            <span className="text-muted-foreground text-xs ml-1">
              ({log.resourceId.slice(0, 8)}...)
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'ipAddress',
      header: 'IP Address',
      render: (log: AuditLog) => (
        <span className="text-muted-foreground text-sm font-mono">
          {log.ipAddress || '-'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="font-editorial text-3xl text-foreground">Audit Logs</h1>
        <p className="text-muted-foreground mt-1">
          Monitor all system activity and security events
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-sage-200 pb-2">
        <button
          onClick={() => setActiveTab('all')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl transition-colors',
            activeTab === 'all'
              ? 'bg-sage text-white'
              : 'text-muted-foreground hover:text-foreground hover:bg-sage-100'
          )}
        >
          <Activity className="w-4 h-4" />
          All Activity
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl transition-colors',
            activeTab === 'security'
              ? 'bg-sage text-white'
              : 'text-muted-foreground hover:text-foreground hover:bg-sage-100'
          )}
        >
          <Shield className="w-4 h-4" />
          Security Events
        </button>
        <button
          onClick={() => setActiveTab('logins')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl transition-colors',
            activeTab === 'logins'
              ? 'bg-sage text-white'
              : 'text-muted-foreground hover:text-foreground hover:bg-sage-100'
          )}
        >
          <Lock className="w-4 h-4" />
          Login Attempts
        </button>
      </div>

      {/* All Activity Tab */}
      {activeTab === 'all' && (
        <DataTable
          data={logs?.data || []}
          columns={columns}
          loading={loadingLogs}
          pagination={logs?.pagination}
          onPageChange={handlePageChange}
          onSearch={handleSearch}
          searchPlaceholder="Filter by action..."
          emptyMessage="No audit logs found"
          getRowId={(log) => log.id}
        />
      )}

      {/* Security Events Tab */}
      {activeTab === 'security' && (
        <div className="space-y-4">
          {loadingSecurity ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sage" />
            </div>
          ) : (
            <div className="dashboard-card overflow-hidden !p-0">
              <table className="w-full text-sm">
                <thead className="bg-sage-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Time</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">User</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Event</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sage-100">
                  {securityEvents?.slice(0, 50).map((event: any) => (
                    <tr key={event.id} className="hover:bg-sage-50/50">
                      <td className="px-4 py-3 text-muted-foreground text-sm">
                        {new Date(event.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        {event.user ? (
                          <span className="text-foreground text-sm">{event.user.email}</span>
                        ) : (
                          <span className="text-muted-foreground text-sm">Unknown</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'font-medium',
                          event.action.includes('FAIL') || event.action.includes('SUSPEND') || event.action.includes('DELETE')
                            ? 'text-destructive'
                            : 'text-sage'
                        )}>
                          {event.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-sm">
                        {event.ipAddress || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Login Attempts Tab */}
      {activeTab === 'logins' && (
        <div className="space-y-6">
          {loadingLogins ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sage" />
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="dashboard-card">
                  <p className="text-muted-foreground text-sm">Total Attempts</p>
                  <p className="text-2xl font-editorial text-foreground">
                    {loginAttempts?.summary?.total || 0}
                  </p>
                </div>
                <div className="dashboard-card">
                  <p className="text-muted-foreground text-sm">Successful</p>
                  <p className="text-2xl font-editorial text-sage">
                    {loginAttempts?.summary?.successful || 0}
                  </p>
                </div>
                <div className="dashboard-card">
                  <p className="text-muted-foreground text-sm">Failed</p>
                  <p className="text-2xl font-editorial text-destructive">
                    {loginAttempts?.summary?.failed || 0}
                  </p>
                </div>
                <div className="dashboard-card">
                  <p className="text-muted-foreground text-sm">Failure Rate</p>
                  <p className="text-2xl font-editorial text-warning">
                    {loginAttempts?.summary?.failureRate?.toFixed(1) || 0}%
                  </p>
                </div>
              </div>

              {/* Suspicious IPs */}
              {loginAttempts?.suspiciousIps?.length > 0 && (
                <div className="dashboard-card">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-5 h-5 text-warning" />
                    <h3 className="font-medium text-foreground">Suspicious IP Addresses</h3>
                  </div>
                  <div className="space-y-2">
                    {loginAttempts.suspiciousIps.map((item: any) => (
                      <div
                        key={item.ip}
                        className="flex items-center justify-between p-3 bg-sage-50 rounded-xl"
                      >
                        <span className="text-foreground font-mono">{item.ip}</span>
                        <span className="text-destructive font-medium">
                          {item.failedAttempts} failed attempts
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
