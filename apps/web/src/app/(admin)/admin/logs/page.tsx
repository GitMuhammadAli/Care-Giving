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
  { icon: React.ElementType; fg: string; bg: string; border: string; tag: string }
> = {
  DEBUG: { icon: Bug, fg: 'text-muted-foreground', bg: 'bg-muted', border: 'border-l-muted-foreground/40', tag: 'DBG' },
  INFO:  { icon: Info, fg: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/10', border: 'border-l-blue-500', tag: 'INF' },
  WARN:  { icon: AlertTriangle, fg: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10', border: 'border-l-amber-500', tag: 'WRN' },
  ERROR: { icon: AlertCircle, fg: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-500/10', border: 'border-l-red-500', tag: 'ERR' },
  FATAL: { icon: Flame, fg: 'text-red-700 dark:text-red-300', bg: 'bg-red-100 dark:bg-red-500/15', border: 'border-l-red-600', tag: 'FTL' },
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

// ─── Log Line (compact terminal row) ──────────────────────────────────────────

function LogLine({ log, expanded, onToggle }: { log: ApplicationLog; expanded: boolean; onToggle: () => void }) {
  const c = LEVEL_CFG[log.level] || LEVEL_CFG.INFO;

  return (
    <div className={cn('border-l-[3px] group', c.border, expanded ? 'bg-muted/50' : 'hover:bg-muted/25')}>
      {/* ── Compact row ─────────────────────────────────────── */}
      <div className="flex items-start px-2 py-[3px] cursor-pointer select-none font-mono text-[12px] leading-[18px]" onClick={onToggle}>
        {/* Toggle */}
        <span className="w-4 flex-shrink-0 mt-[1px] text-muted-foreground/40">
          {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100" />}
        </span>

        {/* Timestamp */}
        <span className="text-muted-foreground w-[140px] flex-shrink-0 tabular-nums">{fmtTime(log.timestamp)}</span>

        {/* Level */}
        <span className={cn('w-[34px] flex-shrink-0 font-bold', c.fg)}>{c.tag}</span>

        {/* Service */}
        <span className="text-primary/70 flex-shrink-0 mr-1">{log.service ? `[${log.service}]` : ''}</span>

        {/* Context */}
        {log.context && <span className="text-muted-foreground/60 flex-shrink-0 mr-1">{log.context}:</span>}

        {/* Message */}
        <span className={cn(
          'flex-1 min-w-0',
          log.level === 'ERROR' || log.level === 'FATAL' ? 'text-red-700 dark:text-red-300' :
          log.level === 'WARN' ? 'text-amber-700 dark:text-amber-200' : 'text-foreground/85',
          !expanded && 'truncate',
        )}>
          {log.message}
        </span>

        {/* Request ID (hover) */}
        {log.requestId && (
          <span className="text-muted-foreground/30 ml-1 flex-shrink-0 hidden lg:block">{log.requestId.slice(0, 8)}</span>
        )}
      </div>

      {/* ── Expanded detail panel ───────────────────────────── */}
      {expanded && (
        <div className="ml-6 mr-3 pb-3 mt-1 space-y-2 text-[11px]">
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
            <Detail label="stacktrace" text={log.errorStack} red maxH="max-h-60" />
          )}

          {/* Metadata JSON */}
          {log.metadata && Object.keys(log.metadata).length > 0 && (
            <Detail label="metadata" text={JSON.stringify(log.metadata, null, 2)} green maxH="max-h-48" />
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
      <span className="text-muted-foreground/50">{k}=</span>
      <span className={cls || 'text-foreground/80'}>{v}</span>
      {copy && (
        <button onClick={(e) => { e.stopPropagation(); clip(v); }} className="ml-0.5 text-muted-foreground/30 hover:text-foreground">
          <Copy className="w-2.5 h-2.5 inline" />
        </button>
      )}
    </span>
  );
}

function Detail({ label, text, red, green, maxH }: { label: string; text: string; red?: boolean; green?: boolean; maxH?: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-0.5">
        <span className={cn('text-[9px] font-medium uppercase tracking-wider', red ? 'text-red-500/60' : 'text-muted-foreground/50')}>
          {label}
        </span>
        <button onClick={(e) => { e.stopPropagation(); clip(text); }} className="text-[9px] text-muted-foreground/40 hover:text-foreground flex items-center gap-0.5">
          <Copy className="w-2.5 h-2.5" /> copy
        </button>
      </div>
      <pre className={cn(
        'text-[11px] font-mono rounded-md p-2 overflow-x-auto whitespace-pre-wrap border',
        red ? 'text-red-700 dark:text-red-300/80 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/30' :
        green ? 'text-emerald-700 dark:text-emerald-300/80 bg-muted border-border' :
        'text-foreground/80 bg-muted border-border',
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
      className="text-[10px] px-1.5 py-0.5 rounded bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
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
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Terminal className="w-4.5 h-4.5 text-primary" />
            </div>
            <div>
              <h1 className="font-editorial text-2xl text-foreground leading-tight">System Logs</h1>
              <p className="text-xs text-muted-foreground">
                {total.toLocaleString()} entries
                {filter.service && <> · <span className="text-primary">{filter.service}</span></>}
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
                  ? 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-300 dark:border-green-500/30'
                  : 'bg-card text-muted-foreground border-border hover:text-foreground'
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
              className={cn('p-1.5 rounded-lg border transition-colors', showFilters ? 'bg-primary/10 text-primary border-primary/20' : 'bg-card text-muted-foreground border-border hover:text-foreground')}
            >
              <Filter className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => confirm('Delete logs older than 30 days?') && cleanupMutation.mutate(30)}
              disabled={cleanupMutation.isPending}
              className="p-1.5 rounded-lg bg-card text-muted-foreground border border-border hover:text-destructive transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Row 2: Stats mini bar */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground font-medium">24h:</span>
          {LOG_LEVELS.map((l) => {
            const n = stats?.byLevel?.[l] || 0;
            if (l === 'DEBUG' && n === 0) return null;
            return (
              <button key={l} onClick={() => toggleLevel(l)} className={cn(
                'flex items-center gap-1 px-2 py-1 rounded-md transition-all border',
                selectedLevels.has(l) ? `${LEVEL_CFG[l].bg} ${LEVEL_CFG[l].fg} border-current/20` : 'border-transparent text-muted-foreground hover:bg-muted',
              )}>
                {React.createElement(LEVEL_CFG[l].icon, { className: 'w-3 h-3' })}
                <span className="font-medium">{l}</span>
                <span className="opacity-50">{n}</span>
              </button>
            );
          })}
          <div className="ml-auto" />
          {hasFilters && (
            <button onClick={clearAll} className="text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
              <X className="w-3 h-3" /> Clear
            </button>
          )}
          {expandedIds.size > 0 && (
            <button onClick={() => setExpandedIds(new Set())} className="text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
              <Layers className="w-3 h-3" /> Collapse
            </button>
          )}
        </div>

        {/* Row 3: Filter panel (collapsible) */}
        {showFilters && (
          <div className="flex flex-wrap items-center gap-2">
            <form onSubmit={handleSearch} className="relative flex-1 min-w-[180px] max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search logs..."
                className="w-full bg-background border border-border rounded-lg pl-8 pr-7 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary font-mono"
              />
              {searchInput && (
                <button type="button" onClick={() => { setSearchInput(''); setFilter((p) => ({ ...p, search: undefined, page: 1 })); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="w-3 h-3" />
                </button>
              )}
            </form>

            <div className="flex items-center gap-0.5 bg-muted border border-border rounded-lg p-0.5">
              {TIME_RANGES.map((tr) => (
                <button key={tr.label} onClick={() => handleTime(tr.hours)} className={cn(
                  'px-2 py-1 rounded-md text-[11px] font-medium transition-colors',
                  timeRange === tr.hours ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}>
                  {tr.label}
                </button>
              ))}
            </div>

            {services?.services && services.services.length > 0 && (
              <select onChange={(e) => handleService(e.target.value)} value={filter.service || 'ALL'}
                className="bg-background border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary min-w-[110px]">
                <option value="ALL">All services</option>
                {services.services.map((s) => <option key={s.name} value={s.name}>{s.name} ({s.count})</option>)}
              </select>
            )}
          </div>
        )}
      </div>

      {/* ═══ TERMINAL LOG STREAM ═══════════════════════════════════ */}
      <div className="flex-1 min-h-0 rounded-xl border border-border bg-card overflow-hidden flex flex-col shadow-sm">
        {/* Terminal title bar */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/50 flex-shrink-0">
          <div className="flex items-center gap-2">
            {/* Traffic light dots */}
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
            </div>
            <span className="text-[11px] text-muted-foreground font-mono ml-1">
              logs — {isLoading ? 'loading...' : `${logData.length} of ${total.toLocaleString()}`}
              {isLiveTail && <span className="text-green-600 dark:text-green-400 ml-2">● streaming</span>}
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground/50 font-mono">
            pg {pg?.page || 1}/{pg?.totalPages || 1}
          </span>
        </div>

        {/* Scrollable log output */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto overflow-x-hidden"
        >
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <RefreshCw className="w-5 h-5 text-primary animate-spin" />
              <span className="text-xs text-muted-foreground">Loading logs...</span>
            </div>
          ) : logData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <Terminal className="w-7 h-7 text-muted-foreground/30" />
              <span className="text-sm text-muted-foreground">No logs found</span>
              <span className="text-xs text-muted-foreground/60">Adjust filters or time range</span>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
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
            className="absolute bottom-20 right-8 w-8 h-8 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 transition-transform z-10"
          >
            <ChevronsDown className="w-4 h-4" />
          </button>
        )}

        {/* Pagination bar */}
        {pg && pg.totalPages > 1 && (
          <div className="flex items-center justify-between px-3 py-1.5 border-t border-border bg-muted/50 flex-shrink-0 text-xs">
            <button onClick={() => handlePage(Math.max(1, (pg.page || 1) - 1))} disabled={(pg.page || 1) <= 1}
              className="text-muted-foreground hover:text-foreground disabled:opacity-30 px-2 py-0.5 rounded transition-colors">
              ← Newer
            </button>
            <div className="flex items-center gap-0.5">
              {pageNums(pg.page || 1, pg.totalPages).map((p, i) =>
                p === '...' ? <span key={`d${i}`} className="text-muted-foreground/50 px-1">…</span> : (
                  <button key={p} onClick={() => handlePage(p as number)}
                    className={cn('px-2 py-0.5 rounded-md min-w-[24px] transition-colors',
                      p === pg.page ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}>
                    {p}
                  </button>
                )
              )}
            </div>
            <button onClick={() => handlePage(Math.min(pg.totalPages, (pg.page || 1) + 1))} disabled={(pg.page || 1) >= pg.totalPages}
              className="text-muted-foreground hover:text-foreground disabled:opacity-30 px-2 py-0.5 rounded transition-colors">
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
