'use client';

import Link from 'next/link';
import { Heart, Home, Users, Plus, Check, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useFamilySpace } from '@/contexts/family-space-context';
import { cn } from '@/lib/utils';

interface FamilySpaceSelectorProps {
  onAddCareRecipient?: () => void;
  className?: string;
}

export function FamilySpaceSelector({ onAddCareRecipient, className }: FamilySpaceSelectorProps) {
  const {
    selectedFamily,
    selectedFamilyId,
    selectedCareRecipientId,
    families,
    careRecipients,
    currentRole,
    setSelectedFamily,
    setSelectedCareRecipient,
    isLoading,
  } = useFamilySpace();

  if (isLoading) {
    return (
      <div className={cn('flex items-center gap-3 mb-6', className)}>
        <div className="h-9 w-32 bg-muted animate-pulse rounded-lg" />
        <div className="h-8 w-24 bg-muted animate-pulse rounded-full" />
      </div>
    );
  }

  if (families.length === 0) {
    return null;
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-primary/10 text-primary';
      case 'CAREGIVER':
        return 'bg-emerald-500/10 text-emerald-600';
      case 'VIEWER':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const selectedCareRecipient = careRecipients.find(cr => cr.id === selectedCareRecipientId);

  return (
    <div className={cn('flex flex-wrap items-center gap-2 sm:gap-3 mb-6', className)}>
      {/* Family Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button 
            type="button"
            className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-card hover:bg-accent text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <Home className="w-4 h-4 text-primary shrink-0" />
            <span className="text-foreground truncate max-w-[120px] sm:max-w-[150px]">
              {selectedFamily?.name || 'Select Family'}
            </span>
            {currentRole && (
              <span className={cn('text-[10px] px-1.5 py-0.5 rounded shrink-0', getRoleBadge(currentRole))}>
                {currentRole}
              </span>
            )}
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56 rounded-xl">
          <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wide">
            Your Family Spaces
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {families.map((family) => (
            <DropdownMenuItem
              key={family.id}
              onClick={() => setSelectedFamily(family.id)}
              className="cursor-pointer rounded-lg"
            >
              <Home className="w-4 h-4 mr-2 text-muted-foreground shrink-0" />
              <span className="flex-1 truncate">{family.name}</span>
              <span className={cn('text-[10px] px-1.5 py-0.5 rounded shrink-0', getRoleBadge(family.role))}>
                {family.role}
              </span>
              {family.id === selectedFamilyId && (
                <Check className="w-4 h-4 text-primary ml-1 shrink-0" />
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild className="cursor-pointer rounded-lg">
            <Link href="/care-recipients">
              <Home className="w-4 h-4 mr-2 text-muted-foreground shrink-0" />
              Manage Spaces
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="cursor-pointer rounded-lg">
            <Link href="/family">
              <Users className="w-4 h-4 mr-2 text-muted-foreground shrink-0" />
              Manage Members
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Loved Ones Pills */}
      {careRecipients.length > 0 && (
        <>
          <span className="text-border hidden sm:block">|</span>
          <div className="flex items-center gap-2 flex-wrap">
            {careRecipients.map((cr) => (
              <button
                key={cr.id}
                type="button"
                onClick={() => setSelectedCareRecipient(cr.id)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                  cr.id === selectedCareRecipientId
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted/50 text-foreground hover:bg-muted'
                )}
              >
                <Heart className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate max-w-[80px] sm:max-w-[100px]">
                  {cr.preferredName || cr.fullName?.split(' ')[0] || 'Unknown'}
                </span>
              </button>
            ))}
            {onAddCareRecipient && (
              <button
                type="button"
                onClick={onAddCareRecipient}
                className="inline-flex items-center justify-center w-8 h-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>
        </>
      )}

      {careRecipients.length === 0 && onAddCareRecipient && (
        <>
          <span className="text-border hidden sm:block">|</span>
          <button
            type="button"
            onClick={onAddCareRecipient}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-sm font-medium text-primary hover:bg-primary/10 border border-dashed border-primary/50 hover:border-primary transition-colors"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Add Loved One</span>
          </button>
        </>
      )}
    </div>
  );
}
