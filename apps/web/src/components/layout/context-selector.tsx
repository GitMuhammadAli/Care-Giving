'use client';

import * as React from 'react';
import { Check, ChevronDown, Users, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFamilySpace } from '@/contexts/family-space-context';
import { Avatar } from '@/components/ui/avatar';
import { ROLE_LABELS } from '@/lib/constants';

interface ContextSelectorProps {
  compact?: boolean;
  className?: string;
}

export function ContextSelector({ compact = false, className }: ContextSelectorProps) {
  const {
    selectedFamily,
    selectedCareRecipient,
    families,
    careRecipients,
    currentRole,
    setSelectedFamily,
    setSelectedCareRecipient,
    isLoading,
  } = useFamilySpace();

  const [familyOpen, setFamilyOpen] = React.useState(false);
  const [careRecipientOpen, setCareRecipientOpen] = React.useState(false);

  const familyRef = React.useRef<HTMLDivElement>(null);
  const careRecipientRef = React.useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (familyRef.current && !familyRef.current.contains(event.target as Node)) {
        setFamilyOpen(false);
      }
      if (careRecipientRef.current && !careRecipientRef.current.contains(event.target as Node)) {
        setCareRecipientOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isLoading) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className="h-8 w-24 bg-muted animate-pulse rounded-lg" />
        <div className="h-8 w-24 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  if (families.length === 0) {
    return null;
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'CAREGIVER':
        return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'VIEWER':
        return 'bg-muted text-muted-foreground border-border';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Family Space Selector */}
      <div className="relative" ref={familyRef}>
        <button
          onClick={() => {
            setFamilyOpen(!familyOpen);
            setCareRecipientOpen(false);
          }}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg border border-border',
            'bg-card hover:bg-accent hover:border-primary/50 transition-colors shadow-sm',
            'text-sm font-medium h-9',
            compact ? 'max-w-[140px]' : 'max-w-[200px]'
          )}
        >
          <Users className="w-4 h-4 text-primary flex-shrink-0" />
          <span className="truncate text-foreground">
            {selectedFamily?.name || 'Select Space'}
          </span>
          {currentRole && (
            <span className={cn(
              'text-[10px] px-1.5 py-0.5 rounded border flex-shrink-0 leading-none',
              getRoleBadgeColor(currentRole)
            )}>
              {currentRole}
            </span>
          )}
          <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
        </button>

        {familyOpen && (
          <div className="absolute top-full left-0 mt-1 w-64 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden animate-fade">
            <div className="p-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">
                Family Spaces
              </p>
              {families.map((family) => (
                <button
                  key={family.id}
                  onClick={() => {
                    setSelectedFamily(family.id);
                    setFamilyOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-center gap-2 px-2 py-2 rounded-lg transition-colors text-left',
                    selectedFamily?.id === family.id
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-accent'
                  )}
                >
                  <Users className="w-4 h-4 shrink-0" />
                  <span className="flex-1 truncate text-sm font-medium">{family.name}</span>
                  <span className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded border',
                    getRoleBadgeColor(family.role)
                  )}>
                    {ROLE_LABELS[family.role] || family.role}
                  </span>
                  {selectedFamily?.id === family.id && (
                    <Check className="w-4 h-4 text-primary shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Care Recipient Selector */}
      {selectedFamily && (
        <div className="relative" ref={careRecipientRef}>
          <button
            onClick={() => {
              setCareRecipientOpen(!careRecipientOpen);
              setFamilyOpen(false);
            }}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg border border-border',
              'bg-card hover:bg-accent hover:border-primary/50 transition-colors shadow-sm',
              'text-sm font-medium h-9',
              compact ? 'max-w-[140px]' : 'max-w-[200px]'
            )}
          >
            {selectedCareRecipient ? (
              <>
                <Avatar
                  name={selectedCareRecipient.preferredName || selectedCareRecipient.fullName}
                  src={selectedCareRecipient.photoUrl}
                  size="sm"
                  className="flex-shrink-0"
                />
                <span className="truncate text-foreground">
                  {selectedCareRecipient.preferredName || selectedCareRecipient.fullName?.split(' ')[0]}
                </span>
              </>
            ) : (
              <>
                <Heart className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="truncate text-foreground">
                  {careRecipients.length === 0 ? 'No loved ones' : 'Select loved one'}
                </span>
              </>
            )}
            <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
          </button>

          {careRecipientOpen && careRecipients.length > 0 && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden animate-fade">
              <div className="p-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">
                  Loved Ones
                </p>
                {careRecipients.map((cr) => (
                  <button
                    key={cr.id}
                    onClick={() => {
                      setSelectedCareRecipient(cr.id);
                      setCareRecipientOpen(false);
                    }}
                    className={cn(
                      'w-full flex items-center gap-2 px-2 py-2 rounded-lg transition-colors text-left',
                      selectedCareRecipient?.id === cr.id
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-accent'
                    )}
                  >
                    <Avatar
                      name={cr.preferredName || cr.fullName}
                      src={cr.photoUrl}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{cr.fullName}</p>
                      {cr.preferredName && (
                        <p className="text-xs text-muted-foreground truncate">
                          Goes by {cr.preferredName}
                        </p>
                      )}
                    </div>
                    {selectedCareRecipient?.id === cr.id && (
                      <Check className="w-4 h-4 text-primary shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
