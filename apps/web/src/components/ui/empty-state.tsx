'use client';

import { cn } from '@/lib/utils';
import { Button } from './button';
import { 
  Calendar, 
  Pill, 
  FileText, 
  Users, 
  Activity, 
  Clock,
  Plus
} from 'lucide-react';

export interface EmptyStateProps {
  type?: 'medications' | 'appointments' | 'documents' | 'family' | 'timeline' | 'default';
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

const illustrations = {
  medications: Pill,
  appointments: Calendar,
  documents: FileText,
  family: Users,
  timeline: Activity,
  default: Clock,
};

export function EmptyState({
  type = 'default',
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  const Icon = illustrations[type];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-12 px-6',
        className
      )}
    >
      {/* Organic blob background */}
      <div className="relative mb-6">
        <div className="w-32 h-32 bg-accent-primary-light organic-blob absolute -inset-4 opacity-50" />
        <div className="w-28 h-28 bg-accent-warm-light organic-blob-alt absolute -inset-2 opacity-30 animate-float" />
        <div className="relative w-24 h-24 bg-bg-surface rounded-2xl shadow-md flex items-center justify-center">
          <Icon className="w-10 h-10 text-accent-primary" strokeWidth={1.5} />
        </div>
      </div>

      <h3 className="text-xl font-semibold text-text-primary mb-2">{title}</h3>
      <p className="text-sm text-text-secondary max-w-[280px] mb-6">{description}</p>

      {actionLabel && onAction && (
        <Button onClick={onAction} size="lg" leftIcon={<Plus className="w-5 h-5" />}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

