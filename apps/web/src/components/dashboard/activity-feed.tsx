'use client';

import React, { useState, ElementType } from 'react';
import { LucideIcon } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import { 
  Activity, 
  Pill, 
  Calendar, 
  AlertTriangle, 
  FileText,
  Heart,
  Thermometer,
  Moon,
  Utensils,
  ChevronRight,
  RefreshCw,
  Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface ActivityItem {
  id: string;
  type: string;
  category: 'timeline' | 'medication' | 'appointment' | 'emergency';
  title: string;
  description?: string;
  careRecipientId: string;
  careRecipientName: string;
  actorName?: string;
  severity?: string;
  status?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

interface ActivityFeedResponse {
  activities: ActivityItem[];
  total: number;
  familyId: string;
}

const categoryIcons: Record<string, LucideIcon> = {
  timeline: FileText,
  medication: Pill,
  appointment: Calendar,
  emergency: AlertTriangle,
};

const typeIcons: Record<string, LucideIcon> = {
  VITALS: Thermometer,
  SYMPTOM: Heart,
  MOOD: Heart,
  MEAL: Utensils,
  SLEEP: Moon,
  NOTE: FileText,
  INCIDENT: AlertTriangle,
  MEDICATION_LOG: Pill,
  DOCTOR_VISIT: Calendar,
  PHYSICAL_THERAPY: Activity,
};

const severityColors: Record<string, string> = {
  LOW: 'bg-blue-100 text-blue-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-orange-100 text-orange-800',
  CRITICAL: 'bg-red-100 text-red-800',
};

const statusColors: Record<string, string> = {
  GIVEN: 'bg-green-100 text-green-800',
  SKIPPED: 'bg-orange-100 text-orange-800',
  MISSED: 'bg-red-100 text-red-800',
  SCHEDULED: 'bg-blue-100 text-blue-800',
  CONFIRMED: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
};

interface ActivityFeedProps {
  familyId: string;
  limit?: number;
  className?: string;
  compact?: boolean;
}

export function ActivityFeed({ familyId, limit = 10, className, compact = false }: ActivityFeedProps) {
  const [filter, setFilter] = useState<string | null>(null);
  const { token } = useAuth();

  const { data, isLoading, error, refetch, isFetching } = useQuery<ActivityFeedResponse>({
    queryKey: ['activity-feed', familyId, limit],
    queryFn: async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/families/${familyId}/activity?limit=${limit}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!response.ok) throw new Error('Failed to fetch activity feed');
      return response.json();
    },
    enabled: !!familyId && !!token,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const filteredActivities = filter
    ? data?.activities.filter(a => a.category === filter)
    : data?.activities;

  const filterOptions = [
    { value: null, label: 'All' },
    { value: 'timeline', label: 'Notes' },
    { value: 'medication', label: 'Medications' },
    { value: 'appointment', label: 'Appointments' },
    { value: 'emergency', label: 'Emergencies' },
  ];

  if (error) {
    return (
      <Card className={cn('', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Activity Feed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>Failed to load activity feed</p>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Activity className="h-5 w-5 text-primary" />
          Activity Feed
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-8 w-8"
          >
            <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
          </Button>
        </div>
      </CardHeader>

      {!compact && (
        <div className="px-6 pb-2 flex gap-1 overflow-x-auto">
          {filterOptions.map(opt => (
            <Button
              key={opt.value ?? 'all'}
              variant={filter === opt.value ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setFilter(opt.value)}
              className="text-xs whitespace-nowrap"
            >
              {opt.label}
            </Button>
          ))}
        </div>
      )}

      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredActivities?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No recent activity</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredActivities?.map((activity, index) => (
              <ActivityItem 
                key={activity.id} 
                activity={activity} 
                compact={compact}
                isLast={index === filteredActivities.length - 1}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ActivityItem({ 
  activity, 
  compact, 
  isLast 
}: { 
  activity: ActivityItem; 
  compact: boolean;
  isLast: boolean;
}) {
  const IconComponent: LucideIcon = typeIcons[activity.type] || categoryIcons[activity.category] || Activity;
  const timeAgo = formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true });
  const fullTime = format(new Date(activity.timestamp), 'MMM d, yyyy h:mm a');

  const categoryColors: Record<string, string> = {
    timeline: 'bg-blue-50 text-blue-600 border-blue-200',
    medication: 'bg-purple-50 text-purple-600 border-purple-200',
    appointment: 'bg-green-50 text-green-600 border-green-200',
    emergency: 'bg-red-50 text-red-600 border-red-200',
  };

  return (
    <div className={cn(
      'flex gap-3 py-3 group hover:bg-muted/50 rounded-lg px-2 -mx-2 transition-colors',
      !isLast && 'border-b border-border/50'
    )}>
      {/* Icon */}
      <div className={cn(
        'h-10 w-10 rounded-full flex items-center justify-center shrink-0 border',
        categoryColors[activity.category] || 'bg-gray-50 text-gray-600'
      )}>
        <IconComponent className="h-5 w-5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">
              {activity.title}
            </p>
            {!compact && activity.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                {activity.description}
              </p>
            )}
          </div>
          
          {/* Badges */}
          <div className="flex items-center gap-1 shrink-0">
            {activity.severity && activity.severity !== 'LOW' && (
              <Badge 
                variant="outline" 
                className={cn('text-xs', severityColors[activity.severity])}
              >
                {activity.severity}
              </Badge>
            )}
            {activity.status && (
              <Badge 
                variant="outline" 
                className={cn('text-xs', statusColors[activity.status])}
              >
                {activity.status}
              </Badge>
            )}
          </div>
        </div>

        {/* Meta info */}
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          <span className="font-medium text-foreground/80">
            {activity.careRecipientName}
          </span>
          {activity.actorName && (
            <>
              <span>•</span>
              <span>by {activity.actorName}</span>
            </>
          )}
          <span>•</span>
          <span title={fullTime}>{timeAgo}</span>
        </div>
      </div>

      {/* Arrow for navigation */}
      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity self-center" />
    </div>
  );
}

// Compact version for sidebar or smaller widgets
export function ActivityFeedCompact({ familyId, className }: { familyId: string; className?: string }) {
  return <ActivityFeed familyId={familyId} limit={5} compact className={className} />;
}

export default ActivityFeed;

