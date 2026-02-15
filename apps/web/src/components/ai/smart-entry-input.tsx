'use client';

import { useState } from 'react';
import { useSmartEntryParse } from '@/hooks/use-ai';
import type { ParsedTimelineEntry } from '@/lib/api/ai';
import {
  Wand2,
  Loader2,
  Check,
  X,
  Heart,
  Thermometer,
  Activity,
  Droplets,
  Scale,
  Edit3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SmartEntryInputProps {
  onConfirm: (entry: ParsedTimelineEntry) => void;
  onCancel?: () => void;
}

const SEVERITY_COLORS: Record<string, string> = {
  LOW: 'bg-sage/10 text-sage-700',
  MEDIUM: 'bg-amber-500/10 text-amber-700',
  HIGH: 'bg-terracotta/10 text-terracotta',
  CRITICAL: 'bg-red-500/10 text-red-700',
};

const TYPE_COLORS: Record<string, string> = {
  NOTE: 'bg-blue-500/10 text-blue-700',
  VITALS: 'bg-sage/10 text-sage-700',
  SYMPTOM: 'bg-amber-500/10 text-amber-700',
  INCIDENT: 'bg-red-500/10 text-red-700',
  MOOD: 'bg-purple-500/10 text-purple-700',
  MEAL: 'bg-emerald-500/10 text-emerald-700',
  ACTIVITY: 'bg-cyan-500/10 text-cyan-700',
  SLEEP: 'bg-indigo-500/10 text-indigo-700',
  BATHROOM: 'bg-orange-500/10 text-orange-700',
  MEDICATION_CHANGE: 'bg-pink-500/10 text-pink-700',
};

export function SmartEntryInput({ onConfirm, onCancel }: SmartEntryInputProps) {
  const [text, setText] = useState('');
  const [parsedEntry, setParsedEntry] = useState<ParsedTimelineEntry | null>(null);
  const parseEntryMutation = useSmartEntryParse();

  const handleParse = async () => {
    if (!text.trim()) return;
    try {
      const result = await parseEntryMutation.mutateAsync(text);
      setParsedEntry(result);
    } catch {
      // Error is handled by the mutation
    }
  };

  const handleConfirm = () => {
    if (parsedEntry) {
      onConfirm(parsedEntry);
      setText('');
      setParsedEntry(null);
    }
  };

  const handleReset = () => {
    setParsedEntry(null);
  };

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Input Mode */}
      {!parsedEntry ? (
        <div className="p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-3">
            <Wand2 className="w-4 h-4 text-sage" />
            <span className="text-sm font-medium text-foreground">Smart Entry</span>
            <span className="text-[11px] text-muted-foreground bg-sage/10 px-2 py-0.5 rounded-full">
              AI-powered
            </span>
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type naturally, e.g. 'Mom had breakfast at 8am, blood pressure was 130/85, she seemed tired and didn't want to walk today'"
            className="w-full h-24 resize-none bg-muted/50 rounded-xl px-3 sm:px-4 py-3 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-sage/30 border border-border transition-colors"
            maxLength={2000}
          />

          <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
            <span className="text-[11px] text-muted-foreground">
              {text.length}/2000
            </span>
            <div className="flex gap-2">
              {onCancel && (
                <Button variant="ghost" size="sm" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleParse}
                disabled={!text.trim() || parseEntryMutation.isPending}
                className="bg-sage hover:bg-sage-600 text-white"
              >
                {parseEntryMutation.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Parsing...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-3.5 h-3.5 mr-1.5" />
                    Parse with AI
                  </>
                )}
              </Button>
            </div>
          </div>

          {parseEntryMutation.isError && (
            <p className="text-xs text-red-500 mt-2">
              Failed to parse. Please try again.
            </p>
          )}
        </div>
      ) : (
        /* Preview Mode */
        <div className="p-3 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <Edit3 className="w-4 h-4 text-sage flex-shrink-0" />
              <span className="text-sm font-medium text-foreground truncate">Parsed Entry Preview</span>
            </div>
            <button
              onClick={handleReset}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Edit original
            </button>
          </div>

          {/* Type & Severity badges */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                TYPE_COLORS[parsedEntry.type] || TYPE_COLORS.NOTE
              }`}
            >
              {parsedEntry.type}
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                SEVERITY_COLORS[parsedEntry.severity] || SEVERITY_COLORS.LOW
              }`}
            >
              {parsedEntry.severity}
            </span>
          </div>

          {/* Title & Description */}
          <h4 className="font-medium text-sm text-foreground mb-1">{parsedEntry.title}</h4>
          <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
            {parsedEntry.description}
          </p>

          {/* Vitals */}
          {parsedEntry.vitals && typeof parsedEntry.vitals === 'object' && Object.keys(parsedEntry.vitals).length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
              {parsedEntry.vitals.bloodPressureSystolic && parsedEntry.vitals.bloodPressureDiastolic && (
                <VitalCard
                  icon={<Heart className="w-3.5 h-3.5" />}
                  label="Blood Pressure"
                  value={`${parsedEntry.vitals.bloodPressureSystolic}/${parsedEntry.vitals.bloodPressureDiastolic}`}
                  unit="mmHg"
                />
              )}
              {parsedEntry.vitals.heartRate && (
                <VitalCard
                  icon={<Activity className="w-3.5 h-3.5" />}
                  label="Heart Rate"
                  value={String(parsedEntry.vitals.heartRate)}
                  unit="bpm"
                />
              )}
              {parsedEntry.vitals.temperature && (
                <VitalCard
                  icon={<Thermometer className="w-3.5 h-3.5" />}
                  label="Temperature"
                  value={String(parsedEntry.vitals.temperature)}
                  unit="°F"
                />
              )}
              {parsedEntry.vitals.oxygenLevel && (
                <VitalCard
                  icon={<Droplets className="w-3.5 h-3.5" />}
                  label="Oxygen"
                  value={String(parsedEntry.vitals.oxygenLevel)}
                  unit="%"
                />
              )}
              {parsedEntry.vitals.bloodSugar && (
                <VitalCard
                  icon={<Droplets className="w-3.5 h-3.5" />}
                  label="Blood Sugar"
                  value={String(parsedEntry.vitals.bloodSugar)}
                  unit="mg/dL"
                />
              )}
              {parsedEntry.vitals.weight && (
                <VitalCard
                  icon={<Scale className="w-3.5 h-3.5" />}
                  label="Weight"
                  value={String(parsedEntry.vitals.weight)}
                  unit="lbs"
                />
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-border">
            <Button
              size="sm"
              onClick={handleConfirm}
              className="bg-sage hover:bg-sage-600 text-white flex-1"
            >
              <Check className="w-3.5 h-3.5 mr-1.5" />
              Confirm & Save
            </Button>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <X className="w-3.5 h-3.5 mr-1.5" />
              Discard
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function VitalCard({
  icon,
  label,
  value,
  unit,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="bg-muted/50 rounded-xl px-3 py-2 flex items-center gap-2 min-w-0 overflow-hidden">
      <span className="text-sage flex-shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground truncate">{label}</p>
        <p className="text-xs font-medium text-foreground truncate">
          {value} <span className="text-muted-foreground font-normal">{unit}</span>
        </p>
      </div>
    </div>
  );
}
