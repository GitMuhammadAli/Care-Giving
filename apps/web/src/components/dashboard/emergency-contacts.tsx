'use client';

import { Phone, AlertTriangle, Heart, Building2, Siren, User } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import { careRecipientsApi, EmergencyContact as EmergencyContactType } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';

interface EmergencyContactsProps {
  careRecipientId?: string;
}

// Default emergency contacts that are always shown
const defaultEmergencyContacts = [
  {
    id: 'default-911',
    name: '911 Emergency',
    phone: '911',
    icon: Siren,
    color: 'bg-destructive text-destructive-foreground',
    description: 'Police, Fire, Medical',
  },
  {
    id: 'default-poison',
    name: 'Poison Control',
    phone: '1-800-222-1222',
    icon: AlertTriangle,
    color: 'bg-yellow-500 text-yellow-950',
    description: '24/7 Poison Helpline',
  },
];

export const EmergencyContacts = ({ careRecipientId }: EmergencyContactsProps) => {
  // Fetch emergency contacts from API
  const { data: contacts, isLoading } = useQuery({
    queryKey: ['emergencyContacts', careRecipientId],
    queryFn: () => careRecipientsApi.getEmergencyContacts(careRecipientId!),
    enabled: !!careRecipientId,
  });

  const handleCall = (contact: { name: string; phone: string }) => {
    toast.success(`Calling ${contact.name}: ${contact.phone}`);
    if (typeof window !== 'undefined') {
      window.location.href = `tel:${contact.phone.replace(/[^0-9]/g, '')}`;
    }
  };

  // Map API contacts to display format
  const apiContacts = (contacts || []).map((contact: EmergencyContactType, index: number) => ({
    id: contact.id,
    name: contact.name,
    phone: contact.phone,
    icon: contact.isPrimary ? Heart : User,
    color: contact.isPrimary ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground',
    description: contact.relationship,
  }));

  // Combine default and API contacts
  const allContacts = [...defaultEmergencyContacts, ...apiContacts].slice(0, 4);

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm bg-destructive/5 border-destructive/20">
        <div className="flex items-center gap-3 mb-5">
          <Skeleton className="w-9 h-9 rounded-xl" />
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-card bg-destructive/5 border-destructive/20">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-destructive/15 flex items-center justify-center">
          <AlertTriangle className="w-4 h-4 text-destructive" />
        </div>
        <h2 className="font-serif text-lg text-foreground">Emergency Contacts</h2>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {allContacts.map((contact) => (
          <button
            key={contact.id}
            onClick={() => handleCall(contact)}
            className="flex flex-col items-center gap-2.5 p-4 rounded-xl bg-background/80 border border-border/50 hover:border-destructive/30 hover:bg-destructive/5 transition-all group"
          >
            <div className={`w-11 h-11 rounded-xl ${contact.color} flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm`}>
              <contact.icon className="w-5 h-5" />
            </div>
            <div className="text-center">
              <p className="font-medium text-foreground text-sm">{contact.name}</p>
              <p className="text-xs text-muted-foreground">{contact.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
