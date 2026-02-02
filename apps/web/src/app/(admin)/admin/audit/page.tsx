'use client';

import { useState } from 'react';
import { useAuditLogs, useSecurityEvents, useLoginAttempts } from '@/hooks/admin';
import { DataTable } from '@/components/admin';
import { Shield, AlertTriangle, Lock, Activity } from 'lucide-react';
import { AuditLog, AuditLogFilter } from '@/lib/api/admin';

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
        <span className="text-slate-400 text-sm">
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
              <p className="text-white text-sm">{log.user.fullName}</p>
              <p className="text-slate-400 text-xs">{log.user.email}</p>
            </>
          ) : (
            <span className="text-slate-500 text-sm">System</span>
          )}
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      render: (log: AuditLog) => (
        <span className="text-white font-medium">{log.action}</span>
      ),
    },
    {
      key: 'resource',
      header: 'Resource',
      render: (log: AuditLog) => (
        <div>
          <span className="text-slate-300 text-sm">{log.resource || '-'}</span>
          {log.resourceId && (
            <span className="text-slate-500 text-xs ml-1">
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
        <span className="text-slate-400 text-sm font-mono">
          {log.ipAddress || '-'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Audit Logs</h1>
        <p className="text-slate-400 mt-1">
          Monitor all system activity and security events
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-700 pb-2">
        <button
          onClick={() => setActiveTab('all')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'all'
              ? 'bg-emerald-600 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Activity className="w-4 h-4" />
          All Activity
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'security'
              ? 'bg-emerald-600 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Shield className="w-4 h-4" />
          Security Events
        </button>
        <button
          onClick={() => setActiveTab('logins')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'logins'
              ? 'bg-emerald-600 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
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
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
            </div>
          ) : (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-800/80">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Time</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">User</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Event</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {securityEvents?.slice(0, 50).map((event: any) => (
                    <tr key={event.id} className="hover:bg-slate-700/30">
                      <td className="px-4 py-3 text-slate-400 text-sm">
                        {new Date(event.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        {event.user ? (
                          <span className="text-white text-sm">{event.user.email}</span>
                        ) : (
                          <span className="text-slate-500 text-sm">Unknown</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-medium ${
                          event.action.includes('FAIL') || event.action.includes('SUSPEND') || event.action.includes('DELETE')
                            ? 'text-red-400'
                            : 'text-emerald-400'
                        }`}>
                          {event.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 font-mono text-sm">
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
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                  <p className="text-slate-400 text-sm">Total Attempts</p>
                  <p className="text-2xl font-bold text-white">
                    {loginAttempts?.summary?.total || 0}
                  </p>
                </div>
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                  <p className="text-slate-400 text-sm">Successful</p>
                  <p className="text-2xl font-bold text-emerald-400">
                    {loginAttempts?.summary?.successful || 0}
                  </p>
                </div>
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                  <p className="text-slate-400 text-sm">Failed</p>
                  <p className="text-2xl font-bold text-red-400">
                    {loginAttempts?.summary?.failed || 0}
                  </p>
                </div>
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                  <p className="text-slate-400 text-sm">Failure Rate</p>
                  <p className="text-2xl font-bold text-amber-400">
                    {loginAttempts?.summary?.failureRate?.toFixed(1) || 0}%
                  </p>
                </div>
              </div>

              {/* Suspicious IPs */}
              {loginAttempts?.suspiciousIps?.length > 0 && (
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                    <h3 className="text-lg font-semibold text-white">Suspicious IP Addresses</h3>
                  </div>
                  <div className="space-y-2">
                    {loginAttempts.suspiciousIps.map((item: any) => (
                      <div
                        key={item.ip}
                        className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg"
                      >
                        <span className="text-white font-mono">{item.ip}</span>
                        <span className="text-red-400 font-medium">
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

