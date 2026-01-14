'use client';

import { useState } from 'react';
import { Phone, Mail, Plus, User, Stethoscope, Building, Users, Star, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { careRecipientsApi, Doctor, EmergencyContact } from '@/lib/api';
import { useFamilyMembers } from '@/hooks/use-family';
import { Skeleton } from '@/components/ui/skeleton';

interface Contact {
  id: string;
  name: string;
  role: string;
  type: 'doctor' | 'specialist' | 'pharmacy' | 'insurance' | 'family' | 'caregiver' | 'emergency';
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
  isPrimary?: boolean;
}

interface ContactsDirectoryProps {
  careRecipientId: string;
  familyId: string;
}

const contactTypeIcons: Record<string, React.ReactNode> = {
  doctor: <Stethoscope className="w-4 h-4" />,
  specialist: <Stethoscope className="w-4 h-4" />,
  pharmacy: <Building className="w-4 h-4" />,
  insurance: <Building className="w-4 h-4" />,
  family: <Users className="w-4 h-4" />,
  caregiver: <User className="w-4 h-4" />,
  emergency: <Phone className="w-4 h-4" />,
};

const contactTypeColors: Record<string, string> = {
  doctor: 'bg-primary/20 text-primary',
  specialist: 'bg-secondary/20 text-secondary-foreground',
  pharmacy: 'bg-muted text-muted-foreground',
  insurance: 'bg-accent text-accent-foreground',
  family: 'bg-primary/15 text-primary',
  caregiver: 'bg-primary/20 text-primary',
  emergency: 'bg-destructive/20 text-destructive',
};

export const ContactsDirectory = ({ careRecipientId, familyId }: ContactsDirectoryProps) => {
  const queryClient = useQueryClient();

  // Fetch doctors
  const { data: doctors, isLoading: doctorsLoading } = useQuery({
    queryKey: ['doctors', careRecipientId],
    queryFn: () => careRecipientsApi.getDoctors(careRecipientId),
    enabled: !!careRecipientId,
  });

  // Fetch emergency contacts
  const { data: emergencyContacts, isLoading: emergencyLoading } = useQuery({
    queryKey: ['emergencyContacts', careRecipientId],
    queryFn: () => careRecipientsApi.getEmergencyContacts(careRecipientId),
    enabled: !!careRecipientId,
  });

  // Fetch family members
  const { data: familyMembers, isLoading: familyLoading } = useFamilyMembers(familyId);

  // Add doctor mutation
  const addDoctorMutation = useMutation({
    mutationFn: (data: Omit<Doctor, 'id'>) => careRecipientsApi.addDoctor(careRecipientId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctors', careRecipientId] });
      toast.success('Contact added successfully!');
    },
    onError: () => {
      toast.error('Failed to add contact');
    },
  });

  // Add emergency contact mutation
  const addEmergencyContactMutation = useMutation({
    mutationFn: (data: Omit<EmergencyContact, 'id'>) =>
      careRecipientsApi.addEmergencyContact(careRecipientId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emergencyContacts', careRecipientId] });
      toast.success('Emergency contact added!');
    },
    onError: () => {
      toast.error('Failed to add emergency contact');
    },
  });

  const [addOpen, setAddOpen] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [newContact, setNewContact] = useState({
    name: '',
    role: '',
    type: 'family' as Contact['type'],
    phone: '',
    email: '',
    address: '',
    notes: '',
  });

  const isLoading = doctorsLoading || emergencyLoading || familyLoading;

  // Combine all contacts into unified list
  const allContacts: Contact[] = [
    // Map doctors to contacts
    ...(doctors || []).map((doc): Contact => ({
      id: doc.id,
      name: doc.name,
      role: doc.specialty || 'Doctor',
      type: doc.specialty?.toLowerCase().includes('primary') ? 'doctor' : 'specialist',
      phone: doc.phone || '',
      email: doc.email,
      address: doc.address,
      notes: doc.notes,
    })),
    // Map emergency contacts
    ...(emergencyContacts || []).map((contact): Contact => ({
      id: contact.id,
      name: contact.name,
      role: contact.relationship,
      type: 'emergency',
      phone: contact.phone,
      email: contact.email,
      isPrimary: contact.isPrimary,
    })),
    // Map family members
    ...(familyMembers || []).map((member): Contact => ({
      id: member.id,
      name: member.user.fullName,
      role: member.role === 'ADMIN' ? 'Family Admin' : member.role === 'CAREGIVER' ? 'Caregiver' : 'Family Member',
      type: member.role === 'CAREGIVER' ? 'caregiver' : 'family',
      phone: '',
      email: member.user.email,
    })),
  ];

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newContact.type === 'doctor' || newContact.type === 'specialist') {
      await addDoctorMutation.mutateAsync({
        name: newContact.name,
        specialty: newContact.role,
        phone: newContact.phone,
        email: newContact.email || undefined,
        address: newContact.address || undefined,
        notes: newContact.notes || undefined,
      });
    } else if (newContact.type === 'emergency') {
      await addEmergencyContactMutation.mutateAsync({
        name: newContact.name,
        relationship: newContact.role,
        phone: newContact.phone,
        email: newContact.email || undefined,
        isPrimary: false,
      });
    } else {
      toast.success('Contact added successfully!');
    }

    setNewContact({
      name: '',
      role: '',
      type: 'family',
      phone: '',
      email: '',
      address: '',
      notes: '',
    });
    setAddOpen(false);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const filteredContacts = filter === 'all'
    ? allContacts
    : allContacts.filter(c => c.type === filter || (filter === 'doctor' && c.type === 'specialist'));

  const filterOptions = [
    { value: 'all', label: 'All' },
    { value: 'doctor', label: 'Doctors' },
    { value: 'family', label: 'Family' },
    { value: 'emergency', label: 'Emergency' },
  ];

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-8 w-16" />
        </div>
        <div className="flex gap-2 mb-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-8 w-20" />
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (allContacts.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-serif text-xl text-foreground flex items-center gap-2">
            <Phone className="w-5 h-5 text-primary" />
            Contacts
          </h2>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="ghost" className="text-primary hover:text-primary hover:bg-primary/10">
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </DialogTrigger>
            <ContactFormDialog
              newContact={newContact}
              setNewContact={setNewContact}
              onSubmit={handleAddContact}
              isLoading={addDoctorMutation.isPending || addEmergencyContactMutation.isPending}
            />
          </Dialog>
        </div>
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-primary/60" />
          </div>
          <h3 className="font-medium text-foreground mb-2">No contacts yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Add doctors, family members, and emergency contacts</p>
          <Button onClick={() => setAddOpen(true)} className="rounded-xl">
            <Plus className="w-4 h-4 mr-2" />
            Add First Contact
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-serif text-xl text-foreground flex items-center gap-2">
          <Phone className="w-5 h-5 text-primary" />
          Contacts
        </h2>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="ghost" className="text-primary hover:text-primary hover:bg-primary/10">
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </DialogTrigger>
          <ContactFormDialog
            newContact={newContact}
            setNewContact={setNewContact}
            onSubmit={handleAddContact}
            isLoading={addDoctorMutation.isPending || addEmergencyContactMutation.isPending}
          />
        </Dialog>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {filterOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => setFilter(option.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filter === option.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-accent/50 text-muted-foreground hover:bg-accent'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Contact List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {filteredContacts.map((contact) => (
          <div
            key={contact.id}
            className="p-4 rounded-lg bg-accent/50 hover:bg-accent transition-colors border border-transparent hover:border-border"
          >
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${contactTypeColors[contact.type]}`}>
                {contactTypeIcons[contact.type]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground truncate">{contact.name}</p>
                  {contact.isPrimary && (
                    <Star className="w-4 h-4 text-primary fill-primary" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{contact.role}</p>

                <div className="flex flex-wrap items-center gap-3 mt-2">
                  {contact.phone && (
                    <button
                      onClick={() => copyToClipboard(contact.phone, 'Phone')}
                      className="flex items-center gap-1 text-sm text-primary hover:text-primary/80"
                    >
                      <Phone className="w-3 h-3" />
                      {contact.phone}
                      <Copy className="w-3 h-3 ml-1 opacity-50" />
                    </button>
                  )}
                  {contact.email && (
                    <button
                      onClick={() => copyToClipboard(contact.email!, 'Email')}
                      className="flex items-center gap-1 text-sm text-primary hover:text-primary/80"
                    >
                      <Mail className="w-3 h-3" />
                      <span className="truncate max-w-32">{contact.email}</span>
                      <Copy className="w-3 h-3 ml-1 opacity-50" />
                    </button>
                  )}
                </div>

                {contact.notes && (
                  <p className="text-xs text-muted-foreground mt-2 bg-muted/50 px-2 py-1 rounded">
                    {contact.notes}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button variant="ghost" className="w-full mt-4 text-primary hover:text-primary hover:bg-primary/10">
        View All Contacts
      </Button>
    </div>
  );
};

// Separate dialog form component
function ContactFormDialog({
  newContact,
  setNewContact,
  onSubmit,
  isLoading,
}: {
  newContact: {
    name: string;
    role: string;
    type: Contact['type'];
    phone: string;
    email: string;
    address: string;
    notes: string;
  };
  setNewContact: (contact: typeof newContact) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
}) {
  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle className="font-serif">Add Contact</DialogTitle>
      </DialogHeader>
      <form onSubmit={onSubmit} className="space-y-4 mt-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">Name</label>
            <Input
              value={newContact.name}
              onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
              placeholder="Full name"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">Role</label>
            <Input
              value={newContact.role}
              onChange={(e) => setNewContact({ ...newContact, role: e.target.value })}
              placeholder="e.g., Primary Doctor"
              required
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">Type</label>
            <select
              value={newContact.type}
              onChange={(e) => setNewContact({ ...newContact, type: e.target.value as Contact['type'] })}
              className="w-full h-10 px-3 rounded-md border border-border bg-background text-foreground"
            >
              <option value="doctor">Doctor</option>
              <option value="specialist">Specialist</option>
              <option value="family">Family</option>
              <option value="caregiver">Caregiver</option>
              <option value="emergency">Emergency</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">Phone</label>
            <Input
              value={newContact.phone}
              onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
              placeholder="(555) 123-4567"
              required
            />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-foreground block mb-2">Email</label>
          <Input
            type="email"
            value={newContact.email}
            onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
            placeholder="email@example.com"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground block mb-2">Address</label>
          <Input
            value={newContact.address}
            onChange={(e) => setNewContact({ ...newContact, address: e.target.value })}
            placeholder="Street address"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground block mb-2">Notes</label>
          <Input
            value={newContact.notes}
            onChange={(e) => setNewContact({ ...newContact, notes: e.target.value })}
            placeholder="Policy numbers, timezone, etc."
          />
        </div>
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Adding...' : 'Add Contact'}
        </Button>
      </form>
    </DialogContent>
  );
}

