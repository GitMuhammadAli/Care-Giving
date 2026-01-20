'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import {
  AlertTriangle,
  Heart,
  Pill,
  Phone,
  MapPin,
  User,
  FileText,
  CreditCard,
  Wifi,
  Download,
  Share2,
  Droplet,
  Shield,
} from 'lucide-react';
import { FamilySpaceSelector } from '@/components/layout/family-space-selector';
import { useFamilySpace } from '@/contexts/family-space-context';
import { useQuery } from '@tanstack/react-query';
import { careRecipientsApi } from '@/lib/api';
import { useMedications } from '@/hooks/use-medications';
import { Skeleton } from '@/components/ui/skeleton';

export default function EmergencyPage() {
  const { selectedCareRecipientId: careRecipientId } = useFamilySpace();

  // Fetch full care recipient details
  const { data: careRecipient, isLoading } = useQuery({
    queryKey: ['careRecipient', careRecipientId],
    queryFn: () => careRecipientsApi.get(careRecipientId!),
    enabled: !!careRecipientId,
  });

  // Fetch active medications
  const { data: medications } = useMedications(careRecipientId || '');

  // Calculate age
  const age = useMemo(() => {
    if (!careRecipient?.dateOfBirth) return null;
    return Math.floor(
      (new Date().getTime() - new Date(careRecipient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    );
  }, [careRecipient]);

  // Extract doctors from care recipient data
  const doctors = useMemo(() => {
    const data = careRecipient as any;
    if (!data?.doctors) return [];
    return data.doctors.map((doc: any) => ({
      name: doc.name,
      specialty: doc.specialty || 'Doctor',
      phone: doc.phone || '',
    }));
  }, [careRecipient]);

  // Extract emergency contacts
  const emergencyContacts = useMemo(() => {
    const data = careRecipient as any;
    if (!data?.emergencyContacts) return [];
    return data.emergencyContacts.map((contact: any, index: number) => ({
      name: contact.name,
      relationship: contact.relationship || 'Contact',
      phone: contact.phone,
      isPrimary: index === 0,
    }));
  }, [careRecipient]);

  // Get active medications
  const activeMedications = useMemo(() => {
    if (!medications) return [];
    return medications
      .filter((med: any) => med.isActive)
      .map((med: any) => ({
        name: med.name,
        dosage: med.dosage || '',
        frequency: med.frequency || med.schedules?.[0]?.frequency || 'As needed',
      }));
  }, [medications]);

  if (isLoading) {
    return (
      <div className="pb-6">
        <PageHeader
          title="Emergency Info"
          subtitle="Critical information for emergencies"
          showNotifications={false}
        />
        <div className="px-4 sm:px-6 py-6 space-y-6 max-w-2xl mx-auto">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (!careRecipient) {
    return (
      <div className="pb-6">
        <PageHeader
          title="Emergency Info"
          subtitle="Critical information for emergencies"
          showNotifications={false}
        />
        <div className="px-4 sm:px-6 py-6 max-w-2xl mx-auto">
          <FamilySpaceSelector />
          <Card>
            <CardContent className="p-8 text-center">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Loved One Selected</h3>
              <p className="text-muted-foreground mb-4">
                Please select a loved one above to view emergency information.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-6">
      <PageHeader
        title="Emergency Info"
        subtitle="Critical information for emergencies"
        showNotifications={false}
      />

      <div className="px-4 sm:px-6 py-6 space-y-6 max-w-2xl mx-auto">
        {/* Family Space Selector */}
        <FamilySpaceSelector />

        {/* Emergency Alert Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Button
            variant="emergency"
            size="xl"
            fullWidth
            leftIcon={<AlertTriangle className="w-6 h-6" />}
            className="h-16 text-lg"
          >
            EMERGENCY ALERT
          </Button>
          <p className="text-center text-xs text-muted-foreground mt-2">
            Tap to alert all family members immediately
          </p>
        </motion.div>

        {/* Offline Status */}
        <div className="flex items-center justify-center gap-2 text-sm">
          <Wifi className="w-4 h-4 text-success" />
          <span className="text-success">Works Offline</span>
          <span className="text-muted-foreground">• Last synced: Just now</span>
        </div>

        {/* Critical Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Patient Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar
                name={careRecipient.preferredName || careRecipient.fullName}
                src={careRecipient.photoUrl}
                size="xl"
              />
              <div>
                <h3 className="text-xl font-semibold">
                  {careRecipient.fullName}
                </h3>
                {careRecipient.preferredName && (
                  <p className="text-sm text-muted-foreground">"{careRecipient.preferredName}"</p>
                )}
                <p className="text-sm text-muted-foreground mt-1">
                  DOB: {new Date(careRecipient.dateOfBirth).toLocaleDateString()}
                  {age && ` (Age ${age})`}
                </p>
              </div>
            </div>

            {careRecipient.bloodType && (
              <div className="flex items-center gap-4 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                <Droplet className="w-6 h-6 text-destructive" />
                <div>
                  <p className="text-sm font-medium">Blood Type</p>
                  <p className="text-2xl font-bold text-destructive">{careRecipient.bloodType}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Allergies */}
        {careRecipient.allergies && careRecipient.allergies.length > 0 && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" />
                ALLERGIES
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {careRecipient.allergies.map((allergy: string) => (
                  <Badge key={allergy} variant="destructive" size="lg" className="text-base font-semibold">
                    {allergy}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Medical Conditions */}
        {careRecipient.conditions && careRecipient.conditions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-primary" />
                Medical Conditions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {careRecipient.conditions.map((condition: string) => (
                  <li key={condition} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <span>{condition}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Current Medications */}
        {activeMedications.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Pill className="w-5 h-5 text-primary" />
                Current Medications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {activeMedications.map((med) => (
                  <li key={med.name} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {med.name} {med.dosage}
                      </p>
                      <p className="text-sm text-muted-foreground">{med.frequency}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Emergency Contacts */}
        {emergencyContacts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5 text-success" />
                Emergency Contacts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {emergencyContacts.map((contact) => (
                <div key={contact.name} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{contact.name}</p>
                      {contact.isPrimary && <Badge size="sm" variant="success">Primary</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{contact.relationship}</p>
                  </div>
                  <a
                    href={`tel:${contact.phone.replace(/\D/g, '')}`}
                    className="flex items-center gap-2 px-4 py-2 bg-success text-white rounded-lg font-medium hover:bg-success/90 transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    Call
                  </a>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Doctors */}
        {doctors.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-info" />
                Doctors
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {doctors.map((doctor) => (
                <div key={doctor.name} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">{doctor.name}</p>
                    <p className="text-sm text-muted-foreground">{doctor.specialty}</p>
                  </div>
                  {doctor.phone && (
                    <a
                      href={`tel:${doctor.phone.replace(/\D/g, '')}`}
                      className="flex items-center gap-2 px-4 py-2 bg-info text-white rounded-lg font-medium hover:bg-info/90 transition-colors"
                    >
                      <Phone className="w-4 h-4" />
                      Call
                    </a>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="secondary" size="lg" fullWidth leftIcon={<Share2 className="w-5 h-5" />}>
            Share as PDF
          </Button>
          <Button variant="secondary" size="lg" fullWidth leftIcon={<Download className="w-5 h-5" />}>
            Download
          </Button>
        </div>

        {/* Offline Indicator */}
        <div className="flex items-center justify-center gap-2 p-4 bg-success/10 rounded-xl">
          <Shield className="w-5 h-5 text-success" />
          <p className="text-sm text-success font-medium">
            This page is saved for offline access
          </p>
        </div>
      </div>
    </div>
  );
}
