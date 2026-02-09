'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  useLogs,
  useLogStats,
  useLogDashboard,
  useLogServices,
  useCleanupLogs,
  getLogLevelColor,
} from '@/hooks/admin';
import {
  Search,
  RefreshCw,
  Trash2,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  Clock,
  Server,
  AlertTriangle,
  AlertCircle,
  Info,
  Bug,
  Flame,
  Filter,
  X,
  ArrowDown,
  Pause,
  Play,
  Calendar,
  BarChart3,
  Terminal,
  FileJson,
  Layers,
  Activity,
} from 'lucide-react';
import { ApplicationLog, LogFilter, LogLevel } from '@/lib/api/admin';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

// ─── Constants ────────────────────────────────────────────────────────────────

const LOG_LEVELS: LogLevel[] = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];

const LEVEL_CONFIG: Record<
  LogLevel,
  { icon: React.ElementType; fg: string; bg: string; bar: string; border: string; label: string }
> = {
  DEBUG: {
    icon: Bug,
    fg: 'text-slate-400',
    bg: 'bg-slate-400/10',
    bar: 'bg-slate-400',
    border: 'border-l-slate-400',
    label: 'DBG',
  },
  INFO: {
    icon: Info,
    fg: 'text-blue-400',
    bg: 'bg-blue-400/10',
    bar: 'bg-blue-400',
    border: 'border-l-blue-400',
    label: 'INF',
  },
  WARN: {
    icon: AlertTriangle,
    fg: 'text-amber-400',
    bg: 'bg-amber-400/10',
    bar: 'bg-amber-400',
    border: 'border-l-amber-400',
    label: 'WRN',
  },
  ERROR: {
    icon: AlertCircle,
    fg: 'text-red-400',
    bg: 'bg-red-400/10',
    bar: 'bg-red-400',
    border: 'border-l-red-400',
    label: 'ERR',
  },
  FATAL: {
    icon: Flame,
    fg: 'text-red-300',
    bg: 'bg-red-500/15',
    bar: 'bg-red-500',
    border: 'border-l-red-500',
    label: 'FTL',
  },
};

const TIME_RANGES = [
  { label: '15m', hours: 0.25 },
  { label: '1h', hours: 1 },
  { label: '6h', hours: 6 },
  { label: '12h', hours: 12 },
  { label: '24h', hours: 24 },
  { label: '3d', hours: 72 },
  { label: '7d', hours: 168 },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTimestamp(ts: string, relative = false): string {
  const d = new Date(ts);
  if (relative) {
    const now = Date.now();
    const diff = now - d.getTime();
    if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return `${Math.floor(diff / 86_400_000)}d ago`;
  }
  return d.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function formatTimestampFull(ts: string): string {
  return new Date(ts).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
    hour12: false,
  });
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
  toast.success('Copied to clipboard');
}

// ─── Volume Histogram ─────────────────────────────────────────────────────────

function VolumeHistogram({
  logs,
  stats,
  timeRangeHours,
}: {
  logs: ApplicationLog[];
  stats: any;
  timeRangeHours: number;
}) {
  const bucketCount = 50;
  const now = Date.now();
  const rangeMs = timeRangeHours * 3600_000;
  const bucketSize = rangeMs / bucketCount;

  const buckets = useMemo(() => {
    const result = Array.from({ length: bucketCount }, (_, i) => ({
      start: now - rangeMs + i * bucketSize,
      end: now - rangeMs + (i + 1) * bucketSize,
      counts: { DEBUG: 0, INFO: 0, WARN: 0, ERROR: 0, FATAL: 0 } as Record<LogLevel, number>,
      total: 0,
    }));

    for (const log of logs) {
      const t = new Date(log.timestamp).getTime();
      const idx = Math.floor((t - (now - rangeMs)) / bucketSize);
      if (idx >= 0 && idx < bucketCount) {
        result[idx].counts[log.level]++;
        result[idx].total++;
      }
    }

    return result;
  }, [logs, now, rangeMs, bucketSize, bucketCount]);

  const maxTotal = Math.max(1, ...buckets.map((b) => b.total));

  return (
    <div className="rounded-lg border border-[#2a2a3e] bg-[#181825] p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <BarChart3 className="w-4 h-4" />
          <span>Log volume</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          {LOG_LEVELS.map((level) => (
            <div key={level} className="flex items-center gap-1">
              <div className={cn('w-2 h-2 rounded-sm', LEVEL_CONFIG[level].bar)} />
              <span>{level}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-end gap-[1px] h-16">
        {buckets.map((bucket, i) => {
          const height = (bucket.total / maxTotal) * 100;
          // Determine dominant level for color
          const dominantLevel =
            bucket.counts.FATAL > 0
              ? 'FATAL'
              : bucket.counts.ERROR > 0
                ? 'ERROR'
                : bucket.counts.WARN > 0
                  ? 'WARN'
                  : bucket.counts.INFO > 0
                    ? 'INFO'
                    : 'DEBUG';
          return (
            <div
              key={i}
              className="flex-1 group relative cursor-pointer"
              style={{ height: '64px' }}
            >
              <div
                className={cn(
                  'absolute bottom-0 w-full rounded-t-[1px] transition-opacity',
                  LEVEL_CONFIG[dominantLevel].bar,
                  'opacity-70 hover:opacity-100'
                )}
                style={{ height: `${Math.max(height, bucket.total > 0 ? 3 : 0)}%` }}
              />
              {/* Tooltip */}
              {bucket.total > 0 && (
                <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50">
                  <div className="bg-[#1e1e32] border border-[#2a2a3e] rounded-md px-2 py-1 text-xs whitespace-nowrap shadow-xl">
                    <div className="text-slate-300 font-medium mb-0.5">
                      {new Date(bucket.start).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                    </div>
                    <div className="text-slate-400">{bucket.total} logs</div>
                    {bucket.counts.ERROR > 0 && (
                      <div className="text-red-400">{bucket.counts.ERROR} errors</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {/* Time axis */}
      <div className="flex justify-between mt-1 text-[10px] text-slate-600">
        <span>{formatTimestamp(new Date(now - rangeMs).toISOString())}</span>
        <span>{formatTimestamp(new Date(now).toISOString())}</span>
      </div>
    </div>
  );
}

// ─── Expandable Log Row ───────────────────────────────────────────────────────

function LogRow({
  log,
  isExpanded,
  onToggle,
}: {
  log: ApplicationLog;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const config = LEVEL_CONFIG[log.level] || LEVEL_CONFIG.INFO;
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'border-l-2 transition-colors group',
        config.border,
        isExpanded ? 'bg-[#1e1e32]' : 'hover:bg-[#1a1a2e]'
      )}
    >
      {/* Main row */}
      <div
        className="flex items-start gap-0 px-3 py-1.5 cursor-pointer select-none"
        onClick={onToggle}
      >
        {/* Expand chevron */}
        <div className="w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400" />
          )}
        </div>

        {/* Timestamp */}
        <span className="text-[11px] font-mono text-slate-500 w-[145px] flex-shrink-0 mt-0.5 tabular-nums">
          {formatTimestamp(log.timestamp)}
        </span>

        {/* Level badge */}
        <span
          className={cn(
            'text-[10px] font-bold font-mono px-1.5 py-0.5 rounded w-[38px] text-center flex-shrink-0 mt-0.5',
            config.bg,
            config.fg
          )}
        >
          {config.label}
        </span>

        {/* Service */}
        {log.service && (
          <span className="text-[11px] font-mono text-purple-400/80 ml-2 flex-shrink-0 mt-0.5">
            [{log.service}]
          </span>
        )}

        {/* Context */}
        {log.context && (
          <span className="text-[11px] font-mono text-cyan-400/60 ml-1 flex-shrink-0 mt-0.5">
            {log.context}
          </span>
        )}

        {/* Message */}
        <span
          className={cn(
            'text-[12px] font-mono ml-2 flex-1 min-w-0',
            log.level === 'ERROR' || log.level === 'FATAL'
              ? 'text-red-300/90'
              : log.level === 'WARN'
                ? 'text-amber-200/80'
                : 'text-slate-300/90',
            !isExpanded && 'truncate'
          )}
        >
          {log.message}
        </span>

        {/* Request ID */}
        {log.requestId && (
          <span className="text-[10px] font-mono text-slate-600 ml-2 flex-shrink-0 hidden lg:block">
            {log.requestId.slice(0, 8)}
          </span>
        )}
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="pl-8 pr-4 pb-3 space-y-3">
          {/* Fields grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-1">
            <LogField label="Timestamp" value={formatTimestampFull(log.timestamp)} mono />
            <LogField label="Level" value={log.level} color={config.fg} />
            <LogField label="Service" value={log.service || '—'} />
            <LogField label="Context" value={log.context || '—'} />
            {log.requestId && <LogField label="Request ID" value={log.requestId} mono copyable />}
            {log.userId && <LogField label="User ID" value={log.userId} mono copyable />}
          </div>

          {/* Full message */}
          <div className="mt-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                Message
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); copyToClipboard(log.message); }}
                className="text-[10px] text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-colors"
              >
                <Copy className="w-3 h-3" /> Copy
              </button>
            </div>
            <pre className="text-[12px] font-mono text-slate-300 bg-[#12121e] rounded-md p-3 overflow-x-auto whitespace-pre-wrap border border-[#2a2a3e]">
              {log.message}
            </pre>
          </div>

          {/* Error Stack */}
          {log.errorStack && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-medium text-red-400/70 uppercase tracking-wider">
                  Stack Trace
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); copyToClipboard(log.errorStack!); }}
                  className="text-[10px] text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-colors"
                >
                  <Copy className="w-3 h-3" /> Copy
                </button>
              </div>
              <pre className="text-[11px] font-mono text-red-300/70 bg-red-950/20 rounded-md p-3 overflow-x-auto whitespace-pre-wrap border border-red-900/30 max-h-64 overflow-y-auto">
                {log.errorStack}
              </pre>
            </div>
          )}

          {/* Metadata */}
          {log.metadata && Object.keys(log.metadata).length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <FileJson className="w-3 h-3" /> Metadata
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); copyToClipboard(JSON.stringify(log.metadata, null, 2)); }}
                  className="text-[10px] text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-colors"
                >
                  <Copy className="w-3 h-3" /> Copy JSON
                </button>
              </div>
              <pre className="text-[11px] font-mono text-emerald-300/70 bg-[#12121e] rounded-md p-3 overflow-x-auto border border-[#2a2a3e] max-h-48 overflow-y-auto">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            </div>
          )}

          {/* Action bar */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(JSON.stringify(log, null, 2));
              }}
              className="text-[10px] px-2 py-1 rounded bg-[#2a2a3e] text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1"
            >
              <Copy className="w-3 h-3" /> Copy as JSON
            </button>
            {log.requestId && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  copyToClipboard(log.requestId!);
                }}
                className="text-[10px] px-2 py-1 rounded bg-[#2a2a3e] text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" /> Trace Request
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function LogField({
  label,
  value,
  mono,
  color,
  copyable,
}: {
  label: string;
  value: string;
  mono?: boolean;
  color?: string;
  copyable?: boolean;
}) {
  return (
    <div className="min-w-0">
      <div className="text-[9px] font-medium text-slate-600 uppercase tracking-wider mb-0.5">
        {label}
      </div>
      <div className="flex items-center gap-1">
        <span
          className={cn(
            'text-[11px] truncate',
            mono ? 'font-mono' : '',
            color || 'text-slate-300'
          )}
          title={value}
        >
          {value}
        </span>
        {copyable && (
          <button
            onClick={(e) => { e.stopPropagation(); copyToClipboard(value); }}
            className="text-slate-600 hover:text-slate-400 flex-shrink-0 transition-colors"
          >
            <Copy className="w-2.5 h-2.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminLogsPage() {
  const [filter, setFilter] = useState<LogFilter>({ page: 1, limit: 100 });
  const [selectedLevels, setSelectedLevels] = useState<Set<LogLevel>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [searchInput, setSearchInput] = useState('');
  const [isLiveTail, setIsLiveTail] = useState(false);
  const [timeRange, setTimeRange] = useState(24);
  const [showFilters, setShowFilters] = useState(true);
  const [wrapLines, setWrapLines] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: logs, isLoading: loadingLogs, refetch } = useLogs(filter);
  const { data: stats } = useLogStats(timeRange);
  const { data: dashboard } = useLogDashboard();
  const { data: services } = useLogServices();
  const cleanupMutation = useCleanupLogs();

  // Live tail auto-refresh
  useEffect(() => {
    if (!isLiveTail) return;
    const interval = setInterval(() => {
      refetch();
    }, 3000);
    return () => clearInterval(interval);
  }, [isLiveTail, refetch]);

  // Auto-scroll on new logs when live tail is active
  useEffect(() => {
    if (isLiveTail && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [logs, isLiveTail]);

  // ─── Handlers ─────────────────────────────────────────────────────────

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setFilter((prev) => ({ ...prev, search: searchInput || undefined, page: 1 }));
    },
    [searchInput]
  );

  const toggleLevel = useCallback((level: LogLevel) => {
    setSelectedLevels((prev) => {
      const next = new Set(prev);
      if (next.has(level)) {
        next.delete(level);
      } else {
        next.add(level);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (selectedLevels.size === 0) {
      setFilter((prev) => ({ ...prev, level: undefined, page: 1 }));
    } else if (selectedLevels.size === 1) {
      setFilter((prev) => ({ ...prev, level: Array.from(selectedLevels)[0], page: 1 }));
    } else {
      // API only supports single level filter; show first selected
      setFilter((prev) => ({ ...prev, level: Array.from(selectedLevels)[0], page: 1 }));
    }
  }, [selectedLevels]);

  const handleServiceFilter = useCallback((service: string) => {
    setFilter((prev) => ({
      ...prev,
      service: service === 'ALL' ? undefined : service,
      page: 1,
    }));
  }, []);

  const handleTimeRange = useCallback((hours: number) => {
    setTimeRange(hours);
    const now = new Date();
    const start = new Date(now.getTime() - hours * 3600_000);
    setFilter((prev) => ({
      ...prev,
      startDate: start.toISOString(),
      endDate: now.toISOString(),
      page: 1,
    }));
  }, []);

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const collapseAll = useCallback(() => setExpandedIds(new Set()), []);

  const handleCleanup = useCallback(() => {
    if (confirm('Delete logs older than 30 days? This cannot be undone.')) {
      cleanupMutation.mutate(30);
    }
  }, [cleanupMutation]);

  const handlePageChange = useCallback((page: number) => {
    setFilter((prev) => ({ ...prev, page }));
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, []);

  const clearFilters = useCallback(() => {
    setSelectedLevels(new Set());
    setSearchInput('');
    setFilter({ page: 1, limit: 100 });
    setTimeRange(24);
  }, []);

  // ─── Derived data ─────────────────────────────────────────────────────

  const logData = logs?.data || [];
  const pagination = logs?.pagination;
  const totalLogs = pagination?.total || 0;
  const hasActiveFilters = selectedLevels.size > 0 || filter.search || filter.service;

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#11111b] text-slate-200">
      {/* ── Top Bar ─────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-[#11111b]/95 backdrop-blur-sm border-b border-[#2a2a3e]">
        <div className="px-4 lg:px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Title */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Terminal className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-slate-100">Logs Explorer</h1>
                <p className="text-[11px] text-slate-500">
                  {totalLogs.toLocaleString()} logs
                  {filter.service && <span className="text-purple-400"> · {filter.service}</span>}
                  {filter.level && <span className={LEVEL_CONFIG[filter.level].fg}> · {filter.level}</span>}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* Live tail toggle */}
              <button
                onClick={() => setIsLiveTail(!isLiveTail)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  isLiveTail
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30 animate-pulse'
                    : 'bg-[#1e1e32] text-slate-400 border border-[#2a2a3e] hover:text-slate-200'
                )}
              >
                {isLiveTail ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                {isLiveTail ? 'Live' : 'Tail'}
              </button>

              <button
                onClick={() => refetch()}
                className="p-2 rounded-lg bg-[#1e1e32] text-slate-400 border border-[#2a2a3e] hover:text-slate-200 transition-colors"
                title="Refresh"
              >
                <RefreshCw className={cn('w-3.5 h-3.5', loadingLogs && 'animate-spin')} />
              </button>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  'p-2 rounded-lg border transition-colors',
                  showFilters
                    ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                    : 'bg-[#1e1e32] text-slate-400 border-[#2a2a3e] hover:text-slate-200'
                )}
                title="Toggle filters"
              >
                <Filter className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleCleanup}
                disabled={cleanupMutation.isPending}
                className="p-2 rounded-lg bg-[#1e1e32] text-slate-500 border border-[#2a2a3e] hover:text-red-400 transition-colors"
                title="Cleanup old logs"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Filter Bar ─────────────────────────────────────────────── */}
        {showFilters && (
          <div className="px-4 lg:px-6 pb-3 space-y-3 border-t border-[#1e1e32] pt-3">
            {/* Row 1: Search + Time Range */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <form onSubmit={handleSearch} className="flex-1 min-w-[200px] max-w-md relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search logs... (regex supported)"
                  className="w-full bg-[#1e1e32] border border-[#2a2a3e] rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50 font-mono"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput('');
                      setFilter((prev) => ({ ...prev, search: undefined, page: 1 }));
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </form>

              {/* Time range */}
              <div className="flex items-center gap-1 bg-[#1e1e32] border border-[#2a2a3e] rounded-lg p-0.5">
                {TIME_RANGES.map((tr) => (
                  <button
                    key={tr.label}
                    onClick={() => handleTimeRange(tr.hours)}
                    className={cn(
                      'px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors',
                      timeRange === tr.hours
                        ? 'bg-purple-500/20 text-purple-300'
                        : 'text-slate-500 hover:text-slate-300'
                    )}
                  >
                    {tr.label}
                  </button>
                ))}
              </div>

              {/* Service filter */}
              {services?.services && services.services.length > 0 && (
                <select
                  onChange={(e) => handleServiceFilter(e.target.value)}
                  value={filter.service || 'ALL'}
                  className="bg-[#1e1e32] border border-[#2a2a3e] rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-purple-500/50 appearance-none cursor-pointer min-w-[120px]"
                >
                  <option value="ALL">All services</option>
                  {services.services.map((s) => (
                    <option key={s.name} value={s.name}>
                      {s.name} ({s.count})
                    </option>
                  ))}
                </select>
              )}

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-[11px] text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-colors"
                >
                  <X className="w-3 h-3" /> Clear all
                </button>
              )}
            </div>

            {/* Row 2: Level toggles + Stats */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                {LOG_LEVELS.map((level) => {
                  const cfg = LEVEL_CONFIG[level];
                  const count = stats?.byLevel?.[level] || 0;
                  const isActive = selectedLevels.has(level);
                  return (
                    <button
                      key={level}
                      onClick={() => toggleLevel(level)}
                      className={cn(
                        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all border',
                        isActive
                          ? `${cfg.bg} ${cfg.fg} border-current/20`
                          : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-[#1e1e32]'
                      )}
                    >
                      <cfg.icon className="w-3 h-3" />
                      {level}
                      {count > 0 && (
                        <span className={cn('text-[10px] ml-0.5', isActive ? 'opacity-80' : 'opacity-50')}>
                          {count.toLocaleString()}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-3 text-[11px] text-slate-500">
                <button
                  onClick={() => setWrapLines(!wrapLines)}
                  className={cn(
                    'flex items-center gap-1 hover:text-slate-300 transition-colors',
                    wrapLines && 'text-slate-300'
                  )}
                >
                  <Layers className="w-3 h-3" />
                  Wrap
                </button>
                {expandedIds.size > 0 && (
                  <button
                    onClick={collapseAll}
                    className="flex items-center gap-1 hover:text-slate-300 transition-colors"
                  >
                    <ChevronRight className="w-3 h-3" />
                    Collapse all
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Stats Summary Cards ──────────────────────────────────────── */}
      <div className="px-4 lg:px-6 pt-4 pb-2">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          <StatCard
            label="Total"
            value={stats?.total || 0}
            icon={Activity}
            color="text-slate-300"
          />
          {LOG_LEVELS.map((level) => {
            const cfg = LEVEL_CONFIG[level];
            return (
              <StatCard
                key={level}
                label={level}
                value={stats?.byLevel?.[level] || 0}
                icon={cfg.icon}
                color={cfg.fg}
              />
            );
          })}
        </div>
      </div>

      {/* ── Volume Histogram ─────────────────────────────────────────── */}
      <div className="px-4 lg:px-6 py-2">
        <VolumeHistogram logs={logData} stats={stats} timeRangeHours={timeRange} />
      </div>

      {/* ── Recent Errors Banner ─────────────────────────────────────── */}
      {dashboard?.recentErrors && dashboard.recentErrors.length > 0 && !filter.level && (
        <div className="px-4 lg:px-6 py-2">
          <div className="rounded-lg border border-red-900/30 bg-red-950/20 p-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span className="text-xs font-medium text-red-400">
                {dashboard.recentErrors.length} recent errors
              </span>
              <button
                onClick={() => {
                  setSelectedLevels(new Set<LogLevel>(['ERROR']));
                }}
                className="text-[10px] text-red-400/60 hover:text-red-300 ml-auto transition-colors"
              >
                Show all errors →
              </button>
            </div>
            <div className="space-y-1">
              {dashboard.recentErrors.slice(0, 2).map((err) => (
                <div
                  key={err.id}
                  className="text-[11px] font-mono text-red-300/70 truncate cursor-pointer hover:text-red-200"
                  onClick={() => toggleExpand(err.id)}
                >
                  <span className="text-red-400/50 mr-2">{formatTimestamp(err.timestamp, true)}</span>
                  {err.message}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Log Stream ───────────────────────────────────────────────── */}
      <div className="px-4 lg:px-6 py-2">
        <div className="rounded-lg border border-[#2a2a3e] bg-[#181825] overflow-hidden">
          {/* Stream header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-[#2a2a3e] bg-[#1a1a2e]">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Terminal className="w-3.5 h-3.5" />
              <span>
                {loadingLogs ? 'Loading...' : `${logData.length} of ${totalLogs.toLocaleString()} logs`}
              </span>
              {isLiveTail && (
                <span className="flex items-center gap-1 text-green-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  streaming
                </span>
              )}
            </div>
            <div className="text-[10px] text-slate-600 font-mono">
              Page {pagination?.page || 1} of {pagination?.totalPages || 1}
            </div>
          </div>

          {/* Log entries */}
          <div
            ref={scrollRef}
            className={cn(
              'divide-y divide-[#1e1e32] overflow-y-auto',
              'max-h-[calc(100vh-420px)] min-h-[400px]'
            )}
          >
            {loadingLogs ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <RefreshCw className="w-6 h-6 text-purple-400 animate-spin" />
                <span className="text-sm text-slate-500">Loading logs...</span>
              </div>
            ) : logData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Terminal className="w-8 h-8 text-slate-600" />
                <span className="text-sm text-slate-500">No logs found</span>
                <span className="text-xs text-slate-600">
                  Try adjusting your filters or time range
                </span>
              </div>
            ) : (
              logData.map((log) => (
                <LogRow
                  key={log.id}
                  log={log}
                  isExpanded={expandedIds.has(log.id)}
                  onToggle={() => toggleExpand(log.id)}
                />
              ))
            )}
          </div>

          {/* Pagination footer */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-3 py-2 border-t border-[#2a2a3e] bg-[#1a1a2e]">
              <button
                onClick={() => handlePageChange(Math.max(1, (pagination.page || 1) - 1))}
                disabled={(pagination.page || 1) <= 1}
                className="text-xs text-slate-500 hover:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed px-2 py-1 rounded transition-colors"
              >
                ← Newer
              </button>
              <div className="flex items-center gap-1">
                {generatePageNumbers(pagination.page || 1, pagination.totalPages).map((p, i) =>
                  p === '...' ? (
                    <span key={`dots-${i}`} className="text-xs text-slate-600 px-1">
                      ...
                    </span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => handlePageChange(p as number)}
                      className={cn(
                        'text-xs px-2 py-1 rounded transition-colors min-w-[28px]',
                        p === pagination.page
                          ? 'bg-purple-500/20 text-purple-300'
                          : 'text-slate-500 hover:text-slate-300 hover:bg-[#1e1e32]'
                      )}
                    >
                      {p}
                    </button>
                  )
                )}
              </div>
              <button
                onClick={() =>
                  handlePageChange(Math.min(pagination.totalPages, (pagination.page || 1) + 1))
                }
                disabled={(pagination.page || 1) >= pagination.totalPages}
                className="text-xs text-slate-500 hover:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed px-2 py-1 rounded transition-colors"
              >
                Older →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom padding ───────────────────────────────────────────── */}
      <div className="h-8" />
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="bg-[#181825] border border-[#2a2a3e] rounded-lg px-3 py-2.5">
      <div className={cn('flex items-center gap-1.5 text-[10px] uppercase tracking-wider mb-1', color)}>
        <Icon className="w-3 h-3" />
        {label}
      </div>
      <div className="text-lg font-semibold text-slate-100 tabular-nums">
        {value.toLocaleString()}
      </div>
    </div>
  );
}

// ─── Page Number Generator ────────────────────────────────────────────────────

function generatePageNumbers(current: number, total: number): (number | string)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | string)[] = [];
  pages.push(1);
  if (current > 3) pages.push('...');
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push('...');
  pages.push(total);
  return pages;
}
