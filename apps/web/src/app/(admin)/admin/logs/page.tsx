'use client';

import { useState } from 'react';
import { 
  useLogs, 
  useLogStats, 
  useLogDashboard, 
  useLogServices, 
  useCleanupLogs,
  getLogLevelColor 
} from '@/hooks/admin';
import { DataTable } from '@/components/admin';
import { 
  FileText, 
  AlertTriangle, 
  Info, 
  AlertCircle, 
  Bug, 
  Server,
  Trash2,
  RefreshCw,
  Clock
} from 'lucide-react';
import { ApplicationLog, LogFilter, LogLevel } from '@/lib/api/admin';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const LOG_LEVEL_ICONS: Record<LogLevel, React.ElementType> = {
  DEBUG: Bug,
  INFO: Info,
  WARN: AlertTriangle,
  ERROR: AlertCircle,
  FATAL: AlertCircle,
};

export default function AdminLogsPage() {
  const [filter, setFilter] = useState<LogFilter>({ page: 1, limit: 50 });
  const [selectedLevel, setSelectedLevel] = useState<LogLevel | 'ALL'>('ALL');

  const { data: logs, isLoading: loadingLogs, refetch } = useLogs(filter);
  const { data: stats, isLoading: loadingStats } = useLogStats(24);
  const { data: dashboard, isLoading: loadingDashboard } = useLogDashboard();
  const { data: services } = useLogServices();
  const cleanupMutation = useCleanupLogs();

  const handlePageChange = (page: number) => {
    setFilter((prev) => ({ ...prev, page }));
  };

  const handleSearch = (search: string) => {
    setFilter((prev) => ({ ...prev, search, page: 1 }));
  };

  const handleLevelFilter = (level: LogLevel | 'ALL') => {
    setSelectedLevel(level);
    if (level === 'ALL') {
      setFilter((prev) => ({ ...prev, level: undefined, page: 1 }));
    } else {
      setFilter((prev) => ({ ...prev, level, page: 1 }));
    }
  };

  const handleServiceFilter = (service: string) => {
    setFilter((prev) => ({ 
      ...prev, 
      service: service === 'ALL' ? undefined : service, 
      page: 1 
    }));
  };

  const handleCleanup = () => {
    if (confirm('Are you sure you want to delete logs older than 30 days?')) {
      cleanupMutation.mutate(30);
    }
  };

  const columns = [
    {
      key: 'timestamp',
      header: 'Time',
      render: (log: ApplicationLog) => (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Clock className="w-3 h-3" />
          {new Date(log.timestamp).toLocaleString()}
        </div>
      ),
    },
    {
      key: 'level',
      header: 'Level',
      render: (log: ApplicationLog) => {
        const Icon = LOG_LEVEL_ICONS[log.level] || Info;
        return (
          <span className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
            getLogLevelColor(log.level)
          )}>
            <Icon className="w-3 h-3" />
            {log.level}
          </span>
        );
      },
    },
    {
      key: 'service',
      header: 'Service',
      render: (log: ApplicationLog) => (
        <div className="flex items-center gap-2">
          <Server className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-foreground text-sm font-medium">
            {log.service || 'Unknown'}
          </span>
        </div>
      ),
    },
    {
      key: 'message',
      header: 'Message',
      render: (log: ApplicationLog) => (
        <div className="max-w-md">
          <p className="text-foreground text-sm truncate">{log.message}</p>
          {log.context && (
            <p className="text-muted-foreground text-xs mt-0.5">{log.context}</p>
          )}
        </div>
      ),
    },
    {
      key: 'requestId',
      header: 'Request ID',
      render: (log: ApplicationLog) => (
        <span className="text-muted-foreground text-xs font-mono">
          {log.requestId ? `${log.requestId.slice(0, 8)}...` : '-'}
        </span>
      ),
    },
  ];

  const levels: (LogLevel | 'ALL')[] = ['ALL', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-editorial text-3xl text-foreground">System Logs</h1>
          <p className="text-muted-foreground mt-1">
            Monitor application logs and errors
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCleanup}
            disabled={cleanupMutation.isPending}
            className="gap-2 text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
            Cleanup
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {loadingStats || loadingDashboard ? (
          <>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="dashboard-card animate-pulse">
                <div className="h-4 bg-sage-100 rounded w-20 mb-2" />
                <div className="h-8 bg-sage-100 rounded w-16" />
              </div>
            ))}
          </>
        ) : (
          <>
            <div className="dashboard-card">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <FileText className="w-4 h-4" />
                Total (24h)
              </div>
              <p className="text-2xl font-editorial text-foreground">
                {stats?.total?.toLocaleString() || 0}
              </p>
            </div>
            <div className="dashboard-card">
              <div className="flex items-center gap-2 text-blue-600 text-sm mb-1">
                <Info className="w-4 h-4" />
                Info
              </div>
              <p className="text-2xl font-editorial text-foreground">
                {stats?.byLevel?.INFO?.toLocaleString() || 0}
              </p>
            </div>
            <div className="dashboard-card">
              <div className="flex items-center gap-2 text-amber-600 text-sm mb-1">
                <AlertTriangle className="w-4 h-4" />
                Warnings
              </div>
              <p className="text-2xl font-editorial text-foreground">
                {stats?.byLevel?.WARN?.toLocaleString() || 0}
              </p>
            </div>
            <div className="dashboard-card">
              <div className="flex items-center gap-2 text-destructive text-sm mb-1">
                <AlertCircle className="w-4 h-4" />
                Errors
              </div>
              <p className="text-2xl font-editorial text-foreground">
                {stats?.byLevel?.ERROR?.toLocaleString() || 0}
              </p>
            </div>
            <div className="dashboard-card">
              <div className="flex items-center gap-2 text-red-700 text-sm mb-1">
                <AlertCircle className="w-4 h-4" />
                Fatal
              </div>
              <p className="text-2xl font-editorial text-foreground">
                {stats?.byLevel?.FATAL?.toLocaleString() || 0}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Recent Errors Alert */}
      {dashboard?.recentErrors && dashboard.recentErrors.length > 0 && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <h3 className="font-medium text-destructive">Recent Errors</h3>
          </div>
          <div className="space-y-2">
            {dashboard.recentErrors.slice(0, 3).map((error) => (
              <div 
                key={error.id} 
                className="bg-background rounded-lg p-3 border border-destructive/10"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">
                    {new Date(error.timestamp).toLocaleString()}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground">
                    {error.service}
                  </span>
                </div>
                <p className="text-sm text-destructive font-medium">{error.message}</p>
                {error.errorStack && (
                  <pre className="text-xs text-muted-foreground mt-2 overflow-x-auto whitespace-pre-wrap font-mono bg-muted/50 p-2 rounded">
                    {error.errorStack.split('\n').slice(0, 3).join('\n')}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Level Filter */}
        <div className="flex items-center gap-2">
          {levels.map((level) => (
            <button
              key={level}
              onClick={() => handleLevelFilter(level)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                selectedLevel === level
                  ? 'bg-sage text-white'
                  : 'text-muted-foreground hover:text-foreground hover:bg-sage-100'
              )}
            >
              {level}
            </button>
          ))}
        </div>

        {/* Service Filter */}
        {services?.services && services.services.length > 0 && (
          <select
            onChange={(e) => handleServiceFilter(e.target.value)}
            className="px-3 py-1.5 border border-border bg-background text-foreground text-sm rounded-lg focus:outline-none focus:border-sage"
          >
            <option value="ALL">All Services</option>
            {services.services.map((service) => (
              <option key={service.name} value={service.name}>
                {service.name} ({service.count})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Logs Table */}
      <DataTable
        data={logs?.data || []}
        columns={columns}
        loading={loadingLogs}
        pagination={logs?.pagination}
        onPageChange={handlePageChange}
        onSearch={handleSearch}
        searchPlaceholder="Search logs..."
        emptyMessage="No logs found"
        getRowId={(log) => log.id}
      />
    </div>
  );
}
