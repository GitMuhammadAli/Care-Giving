'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  useLogs,
  useLogStats,
  useLogDashboard,
  useLogServices,
  useCleanupLogs,
} from '@/hooks/admin';
import {
  Search,
  RefreshCw,
  Trash2,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  AlertTriangle,
  AlertCircle,
  Info,
  Bug,
  Flame,
  Filter,
  X,
  Pause,
  Play,
  Terminal,
  FileJson,
  Layers,
  Activity,
  ArrowDown,
  ChevronsDown,
} from 'lucide-react';
import { ApplicationLog, LogFilter, LogLevel } from '@/lib/api/admin';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

// ─── Constants ────────────────────────────────────────────────────────────────

const LOG_LEVELS: LogLevel[] = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];

const LEVEL_CFG: Record<
  LogLevel,
  { icon: React.ElementType; fg: string; bg: string; border: string; tag: string; badge: string }
> = {
  DEBUG: { icon: Bug, fg: 'text-sage-600', bg: 'bg-sage-50', border: 'border-l-sage-400', tag: 'DBG', badge: 'bg-sage-100 text-sage-700 border-sage-200' },
  INFO:  { icon: Info, fg: 'text-blue-700', bg: 'bg-blue-50', border: 'border-l-blue-400', tag: 'INF', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  WARN:  { icon: AlertTriangle, fg: 'text-amber-700', bg: 'bg-amber-50', border: 'border-l-amber-400', tag: 'WRN', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  ERROR: { icon: AlertCircle, fg: 'text-red-700', bg: 'bg-red-50', border: 'border-l-red-400', tag: 'ERR', badge: 'bg-red-50 text-red-700 border-red-200' },
  FATAL: { icon: Flame, fg: 'text-red-800', bg: 'bg-red-100', border: 'border-l-red-600', tag: 'FTL', badge: 'bg-red-100 text-red-800 border-red-300' },
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

function fmtTime(ts: string) {
  return new Date(ts).toLocaleString('en-US', {
    month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
}

function fmtFull(ts: string) {
  return new Date(ts).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    fractionalSecondDigits: 3, hour12: false,
  });
}

function clip(text: string) {
  navigator.clipboard.writeText(text);
  toast.success('Copied');
}

// ─── Log Line ─────────────────────────────────────────────────────────────────

function LogLine({ log, expanded, onToggle }: { log: ApplicationLog; expanded: boolean; onToggle: () => void }) {
  const c = LEVEL_CFG[log.level] || LEVEL_CFG.INFO;

  return (
    <div className={cn(
      'border-l-[3px] group transition-colors',
      c.border,
      expanded ? 'bg-sage-50/60' : 'hover:bg-sage-50/40',
    )}>
      {/* ── Compact row ─────────────────────────────────────── */}
      <div className="flex items-start px-3 py-1.5 cursor-pointer select-none font-mono text-[12px] leading-[18px]" onClick={onToggle}>
        {/* Toggle */}
        <span className="w-4 flex-shrink-0 mt-[1px] text-sage-400">
          {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100" />}
        </span>

        {/* Timestamp */}
        <span className="text-sage-500 w-[140px] flex-shrink-0 tabular-nums">{fmtTime(log.timestamp)}</span>

        {/* Level */}
        <span className={cn('w-[34px] flex-shrink-0 font-bold', c.fg)}>{c.tag}</span>

        {/* Service */}
        <span className="text-sage-600 flex-shrink-0 mr-1">{log.service ? `[${log.service}]` : ''}</span>

        {/* Context */}
        {log.context && <span className="text-sage-400 flex-shrink-0 mr-1">{log.context}:</span>}

        {/* Message */}
        <span className={cn(
          'flex-1 min-w-0',
          log.level === 'ERROR' || log.level === 'FATAL' ? 'text-red-700' :
          log.level === 'WARN' ? 'text-amber-700' : 'text-foreground/85',
          !expanded && 'truncate',
        )}>
          {log.message}
        </span>

        {/* Request ID (hover) */}
        {log.requestId && (
          <span className="text-sage-300 ml-1 flex-shrink-0 hidden lg:block">{log.requestId.slice(0, 8)}</span>
        )}
      </div>

      {/* ── Expanded detail panel ───────────────────────────── */}
      {expanded && (
        <div className="ml-7 mr-3 pb-3 mt-1 space-y-2 text-[11px]">
          {/* Fields */}
          <div className="flex flex-wrap gap-x-6 gap-y-1 font-mono">
            <Field k="timestamp" v={fmtFull(log.timestamp)} />
            <Field k="level" v={log.level} cls={c.fg} />
            <Field k="service" v={log.service || '—'} />
            {log.context && <Field k="context" v={log.context} />}
            {log.requestId && <Field k="requestId" v={log.requestId} copy />}
            {log.userId && <Field k="userId" v={log.userId} copy />}
          </div>

          {/* Full message */}
          <Detail label="message" text={log.message} />

          {/* Stack trace */}
          {log.errorStack && (
            <Detail label="stacktrace" text={log.errorStack} variant="error" maxH="max-h-60" />
          )}

          {/* Metadata JSON */}
          {log.metadata && Object.keys(log.metadata).length > 0 && (
            <Detail label="metadata" text={JSON.stringify(log.metadata, null, 2)} variant="info" maxH="max-h-48" />
          )}

          {/* Actions */}
          <div className="flex gap-1.5 pt-1">
            <MiniBtn icon={Copy} label="Copy JSON" onClick={() => clip(JSON.stringify(log, null, 2))} />
            {log.requestId && <MiniBtn icon={ExternalLink} label="Trace" onClick={() => clip(log.requestId!)} />}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ k, v, cls, copy }: { k: string; v: string; cls?: string; copy?: boolean }) {
  return (
    <span>
      <span className="text-sage-400">{k}=</span>
      <span className={cls || 'text-foreground/80'}>{v}</span>
      {copy && (
        <button onClick={(e) => { e.stopPropagation(); clip(v); }} className="ml-0.5 text-sage-300 hover:text-sage-700">
          <Copy className="w-2.5 h-2.5 inline" />
        </button>
      )}
    </span>
  );
}

function Detail({ label, text, variant, maxH }: { label: string; text: string; variant?: 'error' | 'info'; maxH?: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-0.5">
        <span className={cn('text-[9px] font-medium uppercase tracking-wider', variant === 'error' ? 'text-red-500/70' : 'text-sage-400')}>
          {label}
        </span>
        <button onClick={(e) => { e.stopPropagation(); clip(text); }} className="text-[9px] text-sage-400 hover:text-sage-700 flex items-center gap-0.5">
          <Copy className="w-2.5 h-2.5" /> copy
        </button>
      </div>
      <pre className={cn(
        'text-[11px] font-mono rounded-lg p-2.5 overflow-x-auto whitespace-pre-wrap border',
        variant === 'error' ? 'text-red-700 bg-red-50/80 border-red-200' :
        variant === 'info' ? 'text-sage-800 bg-sage-50 border-sage-200' :
        'text-foreground/80 bg-sage-50/50 border-sage-200',
        maxH && `${maxH} overflow-y-auto`,
      )}>
        {text}
      </pre>
    </div>
  );
}

function MiniBtn({ icon: Icon, label, onClick }: { icon: React.ElementType; label: string; onClick: () => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="text-[10px] px-2 py-1 rounded-md bg-sage-50 border border-sage-200 text-sage-600 hover:text-sage-800 hover:bg-sage-100 transition-colors flex items-center gap-1"
    >
      <Icon className="w-2.5 h-2.5" /> {label}
    </button>
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
  const [atBottom, setAtBottom] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: logs, isLoading, refetch } = useLogs(filter);
  const { data: stats } = useLogStats(timeRange);
  const { data: dashboard } = useLogDashboard();
  const { data: services } = useLogServices();
  const cleanupMutation = useCleanupLogs();

  // Live tail
  useEffect(() => {
    if (!isLiveTail) return;
    const id = setInterval(() => refetch(), 3000);
    return () => clearInterval(id);
  }, [isLiveTail, refetch]);

  // Scroll tracking
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 40);
  }, []);

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, []);

  // Handlers
  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setFilter((prev) => ({ ...prev, search: searchInput || undefined, page: 1 }));
  }, [searchInput]);

  const toggleLevel = useCallback((level: LogLevel) => {
    setSelectedLevels((prev) => {
      const n = new Set(prev);
      n.has(level) ? n.delete(level) : n.add(level);
      return n;
    });
  }, []);

  useEffect(() => {
    const arr = Array.from(selectedLevels);
    setFilter((prev) => ({ ...prev, level: arr.length === 1 ? arr[0] : undefined, page: 1 }));
  }, [selectedLevels]);

  const handleService = useCallback((s: string) => {
    setFilter((prev) => ({ ...prev, service: s === 'ALL' ? undefined : s, page: 1 }));
  }, []);

  const handleTime = useCallback((h: number) => {
    setTimeRange(h);
    const now = new Date();
    setFilter((prev) => ({ ...prev, startDate: new Date(now.getTime() - h * 3600_000).toISOString(), endDate: now.toISOString(), page: 1 }));
  }, []);

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }, []);

  const handlePage = useCallback((p: number) => {
    setFilter((prev) => ({ ...prev, page: p }));
    scrollRef.current?.scrollTo({ top: 0 });
  }, []);

  const clearAll = useCallback(() => {
    setSelectedLevels(new Set());
    setSearchInput('');
    setFilter({ page: 1, limit: 100 });
    setTimeRange(24);
  }, []);

  const logData = logs?.data || [];
  const pg = logs?.pagination;
  const total = pg?.total || 0;
  const hasFilters = selectedLevels.size > 0 || filter.search || filter.service;

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 80px)' }}>
      {/* ═══ TOOLBAR ═══════════════════════════════════════════════ */}
      <div className="flex-shrink-0 space-y-3 pb-3">
        {/* Row 1: Header + actions */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sage-100 flex items-center justify-center">
              <Terminal className="w-4.5 h-4.5 text-sage-700" />
            </div>
            <div>
              <h1 className="font-editorial text-2xl text-foreground leading-tight">System Logs</h1>
              <p className="text-xs text-sage-500">
                {total.toLocaleString()} entries
                {filter.service && <> · <span className="text-sage-700 font-medium">{filter.service}</span></>}
                {filter.level && <> · <span className={LEVEL_CFG[filter.level].fg}>{filter.level}</span></>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsLiveTail(!isLiveTail)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all',
                isLiveTail
                  ? 'bg-green-50 text-green-700 border-green-300'
                  : 'bg-white text-sage-500 border-sage-200 hover:text-sage-700 hover:border-sage-300'
              )}
            >
              {isLiveTail ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              {isLiveTail ? 'Live' : 'Tail'}
              {isLiveTail && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />}
            </button>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5 h-8 text-xs">
              <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} /> Refresh
            </Button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn('p-1.5 rounded-lg border transition-colors', showFilters ? 'bg-sage-100 text-sage-700 border-sage-300' : 'bg-white text-sage-400 border-sage-200 hover:text-sage-700')}
            >
              <Filter className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => confirm('Delete logs older than 30 days?') && cleanupMutation.mutate(30)}
              disabled={cleanupMutation.isPending}
              className="p-1.5 rounded-lg bg-white text-sage-400 border border-sage-200 hover:text-red-600 hover:border-red-200 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Row 2: Stats mini bar */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-sage-500 font-medium">24h:</span>
          {LOG_LEVELS.map((l) => {
            const n = stats?.byLevel?.[l] || 0;
            if (l === 'DEBUG' && n === 0) return null;
            return (
              <button key={l} onClick={() => toggleLevel(l)} className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all border',
                selectedLevels.has(l) ? `${LEVEL_CFG[l].badge} border` : 'border-transparent text-sage-500 hover:bg-sage-50',
              )}>
                {React.createElement(LEVEL_CFG[l].icon, { className: 'w-3 h-3' })}
                <span className="font-medium">{l}</span>
                <span className="opacity-60">{n}</span>
              </button>
            );
          })}
          <div className="ml-auto" />
          {hasFilters && (
            <button onClick={clearAll} className="text-sage-400 hover:text-sage-700 flex items-center gap-1 transition-colors">
              <X className="w-3 h-3" /> Clear
            </button>
          )}
          {expandedIds.size > 0 && (
            <button onClick={() => setExpandedIds(new Set())} className="text-sage-400 hover:text-sage-700 flex items-center gap-1 transition-colors">
              <Layers className="w-3 h-3" /> Collapse
            </button>
          )}
        </div>

        {/* Row 3: Filter panel (collapsible) */}
        {showFilters && (
          <div className="flex flex-wrap items-center gap-2">
            <form onSubmit={handleSearch} className="relative flex-1 min-w-[180px] max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-sage-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search logs... (regex supported)"
                className="w-full bg-white border border-sage-200 rounded-lg pl-8 pr-7 py-1.5 text-xs text-foreground placeholder:text-sage-400 focus:outline-none focus:border-sage-500 focus:ring-1 focus:ring-sage-500/20 font-mono"
              />
              {searchInput && (
                <button type="button" onClick={() => { setSearchInput(''); setFilter((p) => ({ ...p, search: undefined, page: 1 })); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-sage-400 hover:text-sage-700">
                  <X className="w-3 h-3" />
                </button>
              )}
            </form>

            <div className="flex items-center gap-0.5 bg-sage-50 border border-sage-200 rounded-lg p-0.5">
              {TIME_RANGES.map((tr) => (
                <button key={tr.label} onClick={() => handleTime(tr.hours)} className={cn(
                  'px-2 py-1 rounded-md text-[11px] font-medium transition-colors',
                  timeRange === tr.hours ? 'bg-sage-700 text-white shadow-sm' : 'text-sage-500 hover:text-sage-700 hover:bg-sage-100',
                )}>
                  {tr.label}
                </button>
              ))}
            </div>

            {services?.services && services.services.length > 0 && (
              <select onChange={(e) => handleService(e.target.value)} value={filter.service || 'ALL'}
                className="bg-white border border-sage-200 rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-sage-500 min-w-[110px]">
                <option value="ALL">All services</option>
                {services.services.map((s) => <option key={s.name} value={s.name}>{s.name} ({s.count})</option>)}
              </select>
            )}
          </div>
        )}
      </div>

      {/* ═══ LOG STREAM ════════════════════════════════════════════ */}
      <div className="flex-1 min-h-0 rounded-xl border border-sage-200 bg-white overflow-hidden flex flex-col shadow-sm">
        {/* Title bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-sage-200 bg-sage-50/80 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <Terminal className="w-3.5 h-3.5 text-sage-500" />
            <span className="text-[11px] text-sage-600 font-mono font-medium">
              logs — {isLoading ? 'loading...' : `${logData.length} of ${total.toLocaleString()}`}
              {isLiveTail && <span className="text-green-600 ml-2">● streaming</span>}
            </span>
          </div>
          <span className="text-[10px] text-sage-400 font-mono">
            pg {pg?.page || 1}/{pg?.totalPages || 1}
          </span>
        </div>

        {/* Scrollable log output */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto overflow-x-hidden bg-white"
        >
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <RefreshCw className="w-5 h-5 text-sage-500 animate-spin" />
              <span className="text-xs text-sage-500">Loading logs...</span>
            </div>
          ) : logData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 py-16">
              <Terminal className="w-8 h-8 text-sage-300" />
              <span className="text-sm text-sage-500 font-medium">No logs found</span>
              <span className="text-xs text-sage-400">Adjust filters or time range</span>
            </div>
          ) : (
            <div className="divide-y divide-sage-100">
              {logData.map((log) => (
                <LogLine key={log.id} log={log} expanded={expandedIds.has(log.id)} onToggle={() => toggleExpand(log.id)} />
              ))}
            </div>
          )}
        </div>

        {/* Scroll-to-bottom FAB */}
        {!atBottom && logData.length > 10 && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-20 right-8 w-8 h-8 rounded-full bg-sage-700 text-white shadow-lg flex items-center justify-center hover:scale-105 transition-transform z-10"
          >
            <ChevronsDown className="w-4 h-4" />
          </button>
        )}

        {/* Pagination bar */}
        {pg && pg.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2 border-t border-sage-200 bg-sage-50/80 flex-shrink-0 text-xs">
            <button onClick={() => handlePage(Math.max(1, (pg.page || 1) - 1))} disabled={(pg.page || 1) <= 1}
              className="text-sage-500 hover:text-sage-700 disabled:opacity-30 px-2 py-0.5 rounded transition-colors">
              ← Newer
            </button>
            <div className="flex items-center gap-0.5">
              {pageNums(pg.page || 1, pg.totalPages).map((p, i) =>
                p === '...' ? <span key={`d${i}`} className="text-sage-400 px-1">…</span> : (
                  <button key={p} onClick={() => handlePage(p as number)}
                    className={cn('px-2 py-0.5 rounded-md min-w-[24px] transition-colors',
                      p === pg.page ? 'bg-sage-700 text-white' : 'text-sage-500 hover:bg-sage-100')}>
                    {p}
                  </button>
                )
              )}
            </div>
            <button onClick={() => handlePage(Math.min(pg.totalPages, (pg.page || 1) + 1))} disabled={(pg.page || 1) >= pg.totalPages}
              className="text-sage-500 hover:text-sage-700 disabled:opacity-30 px-2 py-0.5 rounded transition-colors">
              Older →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function pageNums(cur: number, tot: number): (number | string)[] {
  if (tot <= 7) return Array.from({ length: tot }, (_, i) => i + 1);
  const p: (number | string)[] = [1];
  if (cur > 3) p.push('...');
  for (let i = Math.max(2, cur - 1); i <= Math.min(tot - 1, cur + 1); i++) p.push(i);
  if (cur < tot - 2) p.push('...');
  p.push(tot);
  return p;
}
