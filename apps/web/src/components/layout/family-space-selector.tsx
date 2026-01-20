'use client';

import Link from 'next/link';
import { Heart, Home, Users, Plus, Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useFamilySpace } from '@/contexts/family-space-context';

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
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="h-10 w-32 bg-muted animate-pulse rounded-xl" />
        <span className="text-muted-foreground text-sm">...</span>
        <div className="h-8 w-20 bg-muted animate-pulse rounded-full" />
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

  return (
    <div className={`flex flex-wrap items-center gap-3 mb-6 animate-fade ${className}`}>
      {/* Family Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="h-10 px-4 rounded-xl border-2 border-border hover:border-primary/50 hover:bg-accent shadow-sm">
            <Home className="w-4 h-4 mr-2 text-primary" />
            <span className="font-medium max-w-[150px] truncate">{selectedFamily?.name || 'Select Family'}</span>
            {currentRole && (
              <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded border ${getRoleBadge(currentRole)}`}>
                {currentRole}
              </span>
            )}
            <ChevronDown className="w-4 h-4 ml-2 text-muted-foreground" />
          </Button>
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
              <Home className="w-4 h-4 mr-2 text-muted-foreground" />
              <span className="flex-1 truncate">{family.name}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${getRoleBadge(family.role)}`}>
                {family.role}
              </span>
              {family.id === selectedFamilyId && (
                <Check className="w-4 h-4 text-primary ml-1" />
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild className="cursor-pointer rounded-lg">
            <Link href="/care-recipients">
              <Home className="w-4 h-4 mr-2 text-muted-foreground" />
              Manage Spaces
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="cursor-pointer rounded-lg">
            <Link href="/family">
              <Users className="w-4 h-4 mr-2 text-muted-foreground" />
              Manage Members
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Loved Ones Pills */}
      {careRecipients.length > 0 && (
        <>
          <span className="text-muted-foreground text-sm">|</span>
          <div className="flex items-center gap-2 flex-wrap">
            {careRecipients.map((cr) => (
              <button
                key={cr.id}
                onClick={() => setSelectedCareRecipient(cr.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all border-2 ${
                  cr.id === selectedCareRecipientId
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-muted/30 text-muted-foreground border-border hover:bg-muted hover:text-foreground hover:border-primary/50'
                }`}
              >
                <Heart className="w-3.5 h-3.5" />
                {cr.preferredName || cr.fullName?.split(' ')[0] || 'Unknown'}
              </button>
            ))}
            {onAddCareRecipient && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onAddCareRecipient}
                className="h-8 px-2 rounded-full text-muted-foreground hover:text-foreground"
              >
                <Plus className="w-4 h-4" />
              </Button>
            )}
          </div>
        </>
      )}

      {careRecipients.length === 0 && onAddCareRecipient && (
        <>
          <span className="text-muted-foreground text-sm">|</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onAddCareRecipient}
            className="h-8 px-3 rounded-full text-primary hover:text-primary hover:bg-primary/10 border-2 border-dashed border-border hover:border-primary/50"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Loved One
          </Button>
        </>
      )}
    </div>
  );
}
