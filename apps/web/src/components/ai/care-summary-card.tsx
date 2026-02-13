'use client';

import { useState } from 'react';
import { useDailySummary, useWeeklySummary } from '@/hooks/use-ai';
import { Sparkles, TrendingUp, AlertTriangle, Pill, Loader2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CareSummaryCardProps {
  careRecipientId: string;
  careRecipientName?: string;
}

export function CareSummaryCard({ careRecipientId, careRecipientName }: CareSummaryCardProps) {
  const [mode, setMode] = useState<'daily' | 'weekly'>('daily');

  const dailyQuery = useDailySummary(
    mode === 'daily' ? careRecipientId : undefined,
  );
  const weeklyQuery = useWeeklySummary(
    mode === 'weekly' ? careRecipientId : undefined,
  );

  const query = mode === 'daily' ? dailyQuery : weeklyQuery;
  const { data, isLoading, error, refetch } = query;

  return (
    <div className="bg-card border border-border rounded-2xl p-5 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sage/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-sage" />
          </div>
          <div>
            <h3 className="font-medium text-sm text-foreground">AI Care Summary</h3>
            <p className="text-xs text-muted-foreground">
              {careRecipientName ? `For ${careRecipientName}` : 'Powered by Gemini'}
            </p>
          </div>
        </div>

        {/* Toggle */}
        <div className="flex bg-muted rounded-lg p-0.5">
          <button
            onClick={() => setMode('daily')}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              mode === 'daily'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setMode('weekly')}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              mode === 'weekly'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Week
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-sage" />
          <span className="ml-2 text-sm text-muted-foreground">Generating summary...</span>
        </div>
      ) : error ? (
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground mb-2">Could not generate summary</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      ) : data ? (
        <div className="space-y-4">
          {/* Summary text */}
          <p className="text-sm text-foreground leading-relaxed">{data.summary}</p>

          {/* Medication stats */}
          {data.medications && data.medications.total > 0 && (
            <div className="flex items-center gap-3 sm:gap-4 bg-sage/5 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3">
              <Pill className="w-4 h-4 text-sage flex-shrink-0" />
              <div className="flex flex-wrap gap-2 sm:gap-4 text-xs">
                <span className="text-sage-700 font-medium">
                  {data.medications.given}/{data.medications.total} given
                </span>
                {data.medications.missed > 0 && (
                  <span className="text-terracotta font-medium">
                    {data.medications.missed} missed
                  </span>
                )}
                {data.medications.skipped > 0 && (
                  <span className="text-muted-foreground">
                    {data.medications.skipped} skipped
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Highlights */}
          {data.highlights && data.highlights.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingUp className="w-3.5 h-3.5 text-sage" />
                <span className="text-xs font-medium text-sage-700">Highlights</span>
              </div>
              <ul className="space-y-1">
                {data.highlights.map((h, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                    <span className="text-sage mt-0.5">+</span>
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Concerns */}
          {data.concerns && data.concerns.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <AlertTriangle className="w-3.5 h-3.5 text-terracotta" />
                <span className="text-xs font-medium text-terracotta">Needs Attention</span>
              </div>
              <ul className="space-y-1">
                {data.concerns.map((c, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                    <span className="text-terracotta mt-0.5">!</span>
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Period */}
          <div className="flex items-center gap-1.5 pt-2 border-t border-border">
            <Calendar className="w-3 h-3 text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground">{data.period}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
