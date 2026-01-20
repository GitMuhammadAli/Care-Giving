'use client';

import { cn, formatRelativeTime } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Pill,
  Calendar,
  Heart,
  AlertTriangle,
  FileText,
  Smile,
  UtensilsCrossed,
  Footprints,
  Moon,
  Droplet,
  Activity,
  Pencil,
  Trash2,
} from 'lucide-react';

export interface TimelineEntryData {
  id: string;
  type: string;
  title: string;
  description?: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  vitals?: {
    bloodPressure?: string;
    heartRate?: number;
    temperature?: number;
    oxygenLevel?: number;
    bloodSugar?: number;
    weight?: number;
  };
  occurredAt: string;
  createdBy: {
    id: string;
    fullName: string;
  };
}

interface TimelineEntryProps {
  entry: TimelineEntryData;
  className?: string;
  onEdit?: (entry: TimelineEntryData) => void;
  onDelete?: (entry: TimelineEntryData) => void;
}

const typeConfig: Record<string, { icon: typeof Pill; color: string; bgColor: string }> = {
  NOTE: { icon: FileText, color: 'text-text-tertiary', bgColor: 'bg-bg-muted' },
  VITALS: { icon: Heart, color: 'text-accent-warm', bgColor: 'bg-accent-warm-light' },
  SYMPTOM: { icon: Activity, color: 'text-warning', bgColor: 'bg-warning-light' },
  INCIDENT: { icon: AlertTriangle, color: 'text-error', bgColor: 'bg-error-light' },
  MOOD: { icon: Smile, color: 'text-info', bgColor: 'bg-info-light' },
  MEAL: { icon: UtensilsCrossed, color: 'text-accent-warm', bgColor: 'bg-accent-warm-light' },
  ACTIVITY: { icon: Footprints, color: 'text-success', bgColor: 'bg-success-light' },
  SLEEP: { icon: Moon, color: 'text-chart-purple', bgColor: 'bg-info-light' },
  BATHROOM: { icon: Droplet, color: 'text-info', bgColor: 'bg-info-light' },
  MEDICATION_CHANGE: { icon: Pill, color: 'text-accent-primary', bgColor: 'bg-accent-primary-light' },
  APPOINTMENT_SUMMARY: { icon: Calendar, color: 'text-info', bgColor: 'bg-info-light' },
  OTHER: { icon: FileText, color: 'text-text-tertiary', bgColor: 'bg-bg-muted' },
};

const severityConfig: Record<string, { variant: 'default' | 'warning' | 'destructive'; label: string }> = {
  LOW: { variant: 'default', label: 'Low' },
  MEDIUM: { variant: 'warning', label: 'Medium' },
  HIGH: { variant: 'destructive', label: 'High' },
  CRITICAL: { variant: 'destructive', label: 'Critical' },
};

export function TimelineEntry({ entry, className, onEdit, onDelete }: TimelineEntryProps) {
  const config = typeConfig[entry.type] || typeConfig.OTHER;
  const Icon = config.icon;
  const severityInfo = entry.severity ? severityConfig[entry.severity] : null;

  return (
    <div className={cn('flex gap-3', className)}>
      {/* Icon */}
      <div
        className={cn(
          'w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center',
          config.bgColor
        )}
      >
        <Icon className={cn('w-5 h-5', config.color)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-medium text-text-primary">{entry.title}</h4>
              {severityInfo && (
                <Badge variant={severityInfo.variant} size="sm">
                  {severityInfo.label}
                </Badge>
              )}
            </div>
            <p className="text-xs text-text-tertiary mt-0.5">
              {entry.createdBy.fullName}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-text-tertiary whitespace-nowrap mr-2">
              {formatRelativeTime(entry.occurredAt)}
            </span>
            {onEdit && (
              <button
                onClick={() => onEdit(entry)}
                className="p-1.5 rounded-lg text-text-tertiary hover:text-primary hover:bg-primary/10 transition-colors"
                title="Edit"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(entry)}
                className="p-1.5 rounded-lg text-text-tertiary hover:text-destructive hover:bg-destructive/10 transition-colors"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Description */}
        {entry.description && (
          <p className="text-sm text-text-secondary mt-1.5 italic">
            "{entry.description}"
          </p>
        )}

        {/* Vitals */}
        {entry.vitals && Object.keys(entry.vitals).length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {entry.vitals.bloodPressure && (
              <span className="text-xs px-2 py-1 bg-bg-muted rounded-md text-text-secondary">
                BP: {entry.vitals.bloodPressure}
              </span>
            )}
            {entry.vitals.heartRate && (
              <span className="text-xs px-2 py-1 bg-bg-muted rounded-md text-text-secondary">
                HR: {entry.vitals.heartRate} bpm
              </span>
            )}
            {entry.vitals.temperature && (
              <span className="text-xs px-2 py-1 bg-bg-muted rounded-md text-text-secondary">
                Temp: {entry.vitals.temperature}°F
              </span>
            )}
            {entry.vitals.oxygenLevel && (
              <span className="text-xs px-2 py-1 bg-bg-muted rounded-md text-text-secondary">
                O2: {entry.vitals.oxygenLevel}%
              </span>
            )}
            {entry.vitals.bloodSugar && (
              <span className="text-xs px-2 py-1 bg-bg-muted rounded-md text-text-secondary">
                Sugar: {entry.vitals.bloodSugar} mg/dL
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

