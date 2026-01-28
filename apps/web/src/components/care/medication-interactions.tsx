'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  AlertTriangle, 
  AlertOctagon,
  Info, 
  ChevronDown, 
  ChevronUp,
  Shield,
  Pill,
  RefreshCw,
  CheckCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface DrugInteraction {
  drug1: string;
  drug2: string;
  severity: 'minor' | 'moderate' | 'major' | 'contraindicated';
  description: string;
  mechanism?: string;
  clinicalEffects?: string;
  management?: string;
}

interface InteractionCheckResult {
  hasInteractions: boolean;
  totalInteractions: number;
  bySeverity: {
    contraindicated: DrugInteraction[];
    major: DrugInteraction[];
    moderate: DrugInteraction[];
    minor: DrugInteraction[];
  };
  checkedMedications: string[];
  timestamp: string;
}

const severityConfig = {
  contraindicated: {
    label: 'Contraindicated',
    icon: AlertOctagon,
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-700',
    badgeColor: 'bg-red-100 text-red-800 border-red-200',
    description: 'These medications should NOT be taken together',
  },
  major: {
    label: 'Major',
    icon: AlertTriangle,
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    textColor: 'text-orange-700',
    badgeColor: 'bg-orange-100 text-orange-800 border-orange-200',
    description: 'Potentially dangerous - consult doctor immediately',
  },
  moderate: {
    label: 'Moderate',
    icon: Info,
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    textColor: 'text-yellow-700',
    badgeColor: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    description: 'May require monitoring or dose adjustment',
  },
  minor: {
    label: 'Minor',
    icon: Info,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-700',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    description: 'Typically not significant but good to be aware',
  },
};

interface MedicationInteractionsProps {
  careRecipientId: string;
  className?: string;
  showAllBySeverity?: boolean;
}

export function MedicationInteractions({ 
  careRecipientId, 
  className,
  showAllBySeverity = false,
}: MedicationInteractionsProps) {
  const [expandedSeverity, setExpandedSeverity] = useState<string | null>('contraindicated');
  const { token } = useAuth();

  const { data, isLoading, error, refetch, isFetching } = useQuery<InteractionCheckResult>({
    queryKey: ['medication-interactions', careRecipientId],
    queryFn: async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/care-recipients/${careRecipientId}/medications/interactions`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!response.ok) throw new Error('Failed to check interactions');
      return response.json();
    },
    enabled: !!careRecipientId && !!token,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (error) {
    return (
      <Card className={cn('', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5" />
            Drug Interactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            <p>Failed to check interactions</p>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasHighSeverity = data && (
    data.bySeverity.contraindicated.length > 0 || 
    data.bySeverity.major.length > 0
  );

  return (
    <Card className={cn(
      '',
      hasHighSeverity && 'border-red-200 bg-red-50/30',
      className
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className={cn('h-5 w-5', hasHighSeverity ? 'text-red-600' : 'text-green-600')} />
          Drug Interactions
        </CardTitle>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => refetch()}
          disabled={isFetching}
          className="h-8 w-8"
        >
          <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
        </Button>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : !data?.hasInteractions ? (
          <div className="text-center py-6">
            <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
            <p className="font-medium text-green-700">No Interactions Found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Checked {data?.checkedMedications.length || 0} medications
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Summary */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground pb-2 border-b">
              <span>Found {data.totalInteractions} potential interaction{data.totalInteractions !== 1 ? 's' : ''}</span>
              {data.checkedMedications.length > 0 && (
                <span className="text-xs">
                  ({data.checkedMedications.length} medications checked)
                </span>
              )}
            </div>

            {/* Interactions by severity */}
            {(['contraindicated', 'major', 'moderate', 'minor'] as const).map(severity => {
              const interactions = data.bySeverity[severity];
              if (interactions.length === 0) return null;

              const config = severityConfig[severity];
              const Icon = config.icon;
              const isExpanded = expandedSeverity === severity || showAllBySeverity;

              return (
                <div 
                  key={severity}
                  className={cn(
                    'rounded-lg border overflow-hidden',
                    config.bgColor,
                    config.borderColor
                  )}
                >
                  <button
                    className="w-full flex items-center justify-between p-3 text-left"
                    onClick={() => setExpandedSeverity(isExpanded ? null : severity)}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={cn('h-5 w-5', config.textColor)} />
                      <span className={cn('font-medium', config.textColor)}>
                        {config.label}
                      </span>
                      <Badge variant="outline" className={cn('text-xs', config.badgeColor)}>
                        {interactions.length}
                      </Badge>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="px-3 pb-3 space-y-2">
                      <p className="text-xs text-muted-foreground mb-2">
                        {config.description}
                      </p>
                      {interactions.map((interaction, idx) => (
                        <InteractionCard key={idx} interaction={interaction} severity={severity} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InteractionCard({ 
  interaction, 
  severity 
}: { 
  interaction: DrugInteraction; 
  severity: string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-lg border p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Pill className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm capitalize">{interaction.drug1}</span>
          <span className="text-muted-foreground">+</span>
          <span className="font-medium text-sm capitalize">{interaction.drug2}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="h-6 text-xs"
        >
          {expanded ? 'Less' : 'More'}
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">{interaction.description}</p>

      {expanded && (
        <div className="space-y-2 pt-2 border-t text-sm">
          {interaction.mechanism && (
            <div>
              <span className="font-medium text-xs uppercase text-muted-foreground">Mechanism:</span>
              <p className="text-muted-foreground">{interaction.mechanism}</p>
            </div>
          )}
          {interaction.clinicalEffects && (
            <div>
              <span className="font-medium text-xs uppercase text-muted-foreground">Effects:</span>
              <p className="text-muted-foreground">{interaction.clinicalEffects}</p>
            </div>
          )}
          {interaction.management && (
            <div>
              <span className="font-medium text-xs uppercase text-green-600">Management:</span>
              <p className="text-green-700">{interaction.management}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Alert banner version for high-severity interactions
export function MedicationInteractionAlert({ 
  careRecipientId,
  className,
}: { 
  careRecipientId: string;
  className?: string;
}) {
  const { token } = useAuth();

  const { data } = useQuery<InteractionCheckResult>({
    queryKey: ['medication-interactions', careRecipientId],
    queryFn: async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/care-recipients/${careRecipientId}/medications/interactions`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!response.ok) throw new Error('Failed to check interactions');
      return response.json();
    },
    enabled: !!careRecipientId && !!token,
    staleTime: 5 * 60 * 1000,
  });

  const criticalCount = data?.bySeverity.contraindicated.length || 0;
  const majorCount = data?.bySeverity.major.length || 0;

  if (criticalCount === 0 && majorCount === 0) return null;

  return (
    <div className={cn(
      'rounded-lg p-4 flex items-center gap-3',
      criticalCount > 0 ? 'bg-red-50 border border-red-200' : 'bg-orange-50 border border-orange-200',
      className
    )}>
      <AlertOctagon className={cn(
        'h-6 w-6 shrink-0',
        criticalCount > 0 ? 'text-red-600' : 'text-orange-600'
      )} />
      <div className="flex-1">
        <p className={cn(
          'font-medium',
          criticalCount > 0 ? 'text-red-700' : 'text-orange-700'
        )}>
          {criticalCount > 0 
            ? `${criticalCount} Contraindicated Drug Interaction${criticalCount !== 1 ? 's' : ''}!`
            : `${majorCount} Major Drug Interaction${majorCount !== 1 ? 's' : ''}`
          }
        </p>
        <p className="text-sm text-muted-foreground">
          Review medication list and consult healthcare provider
        </p>
      </div>
    </div>
  );
}

export default MedicationInteractions;

