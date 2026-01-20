'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { 
  User, Calendar, Pill, FileText, Heart, Clock, Phone, 
  MapPin, AlertTriangle, Edit, ChevronRight, Activity,
  Droplets, Shield
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/page-header';
import { EmergencyButton } from '@/components/care/emergency-button';
import { EditCareRecipientModal } from '@/components/modals/edit-care-recipient-modal';
import { api } from '@/lib/api/client';
import Link from 'next/link';

interface CareRecipient {
  id: string;
  fullName: string;
  preferredName?: string;
  dateOfBirth: string;
  bloodType?: string;
  photoUrl?: string;
  allergies: string[];
  conditions: string[];
  notes?: string;
  emergencyContacts: EmergencyContact[];
  doctors: Doctor[];
  insuranceProvider?: string;
  insurancePolicyNo?: string;
  primaryHospital?: string;
  hospitalAddress?: string;
  createdAt: string;
}

interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  isPrimary: boolean;
}

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  phone: string;
  address?: string;
  isPrimary: boolean;
}

export default function CareRecipientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const { data: careRecipient, isLoading, error } = useQuery<CareRecipient>({
    queryKey: ['care-recipient', id],
    queryFn: () => api.get(`/care-recipients/${id}`),
  });

  const calculateAge = (dateOfBirth: string): number => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (error || !careRecipient) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-error mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-ink mb-2">Care Recipient Not Found</h2>
        <p className="text-warm-gray mb-4">The care recipient you're looking for doesn't exist.</p>
        <Button onClick={() => router.push('/dashboard')}>Go to Dashboard</Button>
      </div>
    );
  }

  const displayName = careRecipient.preferredName
    ? `${careRecipient.fullName.split(' ')[0]} "${careRecipient.preferredName}"`
    : careRecipient.fullName;

  return (
    <div className="space-y-6 pb-24">
      <PageHeader
        title={careRecipient.preferredName || careRecipient.fullName.split(' ')[0]}
        actions={
          <Button variant="secondary" size="sm" onClick={() => setIsEditModalOpen(true)}>
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
        }
      />

      {/* Profile Card */}
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <Avatar
            src={careRecipient.photoUrl}
            name={careRecipient.fullName}
            size="xl"
          />
          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-ink">{displayName}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-warm-gray">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Age {calculateAge(careRecipient.dateOfBirth)}
              </span>
              {careRecipient.bloodType && (
                <span className="flex items-center gap-1">
                  <Droplets className="w-4 h-4" />
                  Blood Type: {careRecipient.bloodType}
                </span>
              )}
            </div>
            {careRecipient.notes && (
              <p className="mt-3 text-sm text-warm-gray">{careRecipient.notes}</p>
            )}
          </div>
        </div>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Link href={`/medications`}>
          <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
            <Pill className="w-6 h-6 text-sage-700 mb-2" />
            <p className="font-medium text-ink">Medications</p>
            <p className="text-sm text-sage-400">View schedule</p>
          </Card>
        </Link>
        <Link href={`/calendar`}>
          <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
            <Calendar className="w-6 h-6 text-sage-700 mb-2" />
            <p className="font-medium text-ink">Calendar</p>
            <p className="text-sm text-sage-400">Appointments</p>
          </Card>
        </Link>
        <Link href={`/documents`}>
          <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
            <FileText className="w-6 h-6 text-sage-700 mb-2" />
            <p className="font-medium text-ink">Documents</p>
            <p className="text-sm text-sage-400">Medical records</p>
          </Card>
        </Link>
        <Link href={`/timeline`}>
          <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
            <Activity className="w-6 h-6 text-sage-700 mb-2" />
            <p className="font-medium text-ink">Timeline</p>
            <p className="text-sm text-sage-400">Health log</p>
          </Card>
        </Link>
      </div>

      {/* Allergies & Conditions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Allergies */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-error" />
            <h2 className="text-lg font-semibold text-ink">Allergies</h2>
          </div>
          {careRecipient.allergies.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {careRecipient.allergies.map((allergy, index) => (
                <Badge key={index} variant="destructive">
                  {allergy}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sage-400 text-sm">No known allergies</p>
          )}
        </Card>

        {/* Medical Conditions */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Heart className="w-5 h-5 text-terracotta" />
            <h2 className="text-lg font-semibold text-ink">Medical Conditions</h2>
          </div>
          {careRecipient.conditions?.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {careRecipient.conditions.map((condition, index) => (
                <Badge key={index} variant="warning">
                  {condition}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sage-400 text-sm">No medical conditions recorded</p>
          )}
        </Card>
      </div>

      {/* Emergency Contacts */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-sage-700" />
            <h2 className="text-lg font-semibold text-ink">Emergency Contacts</h2>
          </div>
        </div>
        <div className="space-y-4">
          {careRecipient.emergencyContacts.length > 0 ? (
            careRecipient.emergencyContacts.map((contact) => (
              <div 
                key={contact.id} 
                className="flex items-center justify-between p-3 bg-sage-50 rounded-lg"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-ink">{contact.name}</p>
                    {contact.isPrimary && (
                      <Badge variant="success" size="sm">Primary</Badge>
                    )}
                  </div>
                  <p className="text-sm text-warm-gray">{contact.relationship}</p>
                </div>
                <a 
                  href={`tel:${contact.phone}`}
                  className="flex items-center gap-2 px-4 py-2 bg-sage-700 text-white rounded-lg hover:bg-sage-600 transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  Call
                </a>
              </div>
            ))
          ) : (
            <p className="text-sage-400 text-sm">No emergency contacts added</p>
          )}
        </div>
      </Card>

      {/* Doctors */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-5 h-5 text-sage-700" />
          <h2 className="text-lg font-semibold text-ink">Doctors</h2>
        </div>
        <div className="space-y-4">
          {careRecipient.doctors.length > 0 ? (
            careRecipient.doctors.map((doctor) => (
              <div 
                key={doctor.id} 
                className="flex items-center justify-between p-3 bg-sage-50 rounded-lg"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-ink">{doctor.name}</p>
                    {doctor.isPrimary && (
                      <Badge variant="success" size="sm">Primary</Badge>
                    )}
                  </div>
                  <p className="text-sm text-warm-gray">{doctor.specialty}</p>
                  {doctor.address && (
                    <p className="text-xs text-sage-400 flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" />
                      {doctor.address}
                    </p>
                  )}
                </div>
                <a 
                  href={`tel:${doctor.phone}`}
                  className="flex items-center gap-2 px-4 py-2 bg-sage-700 text-white rounded-lg hover:bg-sage-600 transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  Call
                </a>
              </div>
            ))
          ) : (
            <p className="text-sage-400 text-sm">No doctors added</p>
          )}
        </div>
      </Card>

      {/* Insurance */}
      {careRecipient.insuranceProvider && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-sage-700" />
            <h2 className="text-lg font-semibold text-ink">Insurance</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-sage-400">Provider</p>
              <p className="font-medium text-ink">{careRecipient.insuranceProvider}</p>
            </div>
            {careRecipient.insurancePolicyNo && (
              <div>
                <p className="text-sm text-sage-400">Policy Number</p>
                <p className="font-medium text-ink">{careRecipient.insurancePolicyNo}</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Primary Hospital */}
      {careRecipient.primaryHospital && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-sage-700" />
            <h2 className="text-lg font-semibold text-ink">Primary Hospital</h2>
          </div>
          <div>
            <p className="font-medium text-ink">{careRecipient.primaryHospital}</p>
            {careRecipient.hospitalAddress && (
              <p className="text-sm text-warm-gray">{careRecipient.hospitalAddress}</p>
            )}
          </div>
        </Card>
      )}

      {/* Emergency Button */}
      <EmergencyButton careRecipientId={id} />

      {/* Edit Modal */}
      <EditCareRecipientModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        careRecipient={careRecipient}
      />
    </div>
  );
}

