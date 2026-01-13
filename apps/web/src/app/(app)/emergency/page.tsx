'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
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
  WifiOff,
  Download,
  Share2,
  Droplet,
  Shield,
} from 'lucide-react';

// Mock emergency data
const mockCareRecipient = {
  firstName: 'Margaret',
  lastName: 'Thompson',
  preferredName: 'Grandma Maggie',
  dateOfBirth: '1946-03-15',
  bloodType: 'A+',
  allergies: ['Penicillin', 'Sulfa drugs'],
  conditions: ['Type 2 Diabetes', 'Hypertension', 'Atrial Fibrillation'],
};

const mockMedications = [
  { name: 'Metformin', dosage: '500mg', frequency: '3x daily' },
  { name: 'Lisinopril', dosage: '10mg', frequency: '1x daily' },
  { name: 'Aspirin', dosage: '81mg', frequency: '1x daily' },
  { name: 'Eliquis', dosage: '5mg', frequency: '2x daily' },
];

const mockEmergencyContacts = [
  { name: 'Sarah Thompson', relationship: 'Daughter', phone: '(555) 123-4567', isPrimary: true },
  { name: 'Mike Thompson', relationship: 'Son', phone: '(555) 987-6543' },
  { name: 'Jennifer Thompson', relationship: 'Daughter', phone: '(555) 456-7890' },
];

const mockDoctors = [
  { name: 'Dr. Jennifer Smith', specialty: 'Primary Care', phone: '(555) 111-2222' },
  { name: 'Dr. Robert Chen', specialty: 'Cardiology', phone: '(555) 333-4444' },
  { name: 'Dr. Lisa Park', specialty: 'Endocrinology', phone: '(555) 555-6666' },
];

const mockInsurance = {
  provider: 'BlueCross BlueShield',
  policyNumber: 'BCB123456789',
  groupNumber: 'GRP987654',
};

const mockHospital = {
  name: 'Memorial Hospital',
  address: '123 Hospital Drive, Springfield, IL 62701',
  phone: '(555) 999-0000',
};

export default function EmergencyPage() {
  const age = Math.floor(
    (new Date().getTime() - new Date(mockCareRecipient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  );

  return (
    <div className="pb-6">
      <PageHeader
        title="Emergency Info"
        subtitle="Critical information for emergencies"
        showNotifications={false}
      />

      <div className="px-4 sm:px-6 py-6 space-y-6 max-w-2xl mx-auto">
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
            className="h-16 text-lg animate-pulse-emergency"
          >
            EMERGENCY ALERT
          </Button>
          <p className="text-center text-xs text-text-tertiary mt-2">
            Tap to alert all family members immediately
          </p>
        </motion.div>

        {/* Offline Status */}
        <div className="flex items-center justify-center gap-2 text-sm">
          <Wifi className="w-4 h-4 text-success" />
          <span className="text-success">Works Offline</span>
          <span className="text-text-tertiary">• Last synced: Just now</span>
        </div>

        {/* Critical Information */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-accent-primary" />
                Patient Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar name={mockCareRecipient.preferredName || mockCareRecipient.firstName} size="xl" />
                <div>
                  <h3 className="text-xl font-semibold text-text-primary">
                    {mockCareRecipient.firstName} {mockCareRecipient.lastName}
                  </h3>
                  {mockCareRecipient.preferredName && (
                    <p className="text-sm text-text-secondary">"{mockCareRecipient.preferredName}"</p>
                  )}
                  <p className="text-sm text-text-tertiary mt-1">
                    DOB: {new Date(mockCareRecipient.dateOfBirth).toLocaleDateString()} (Age {age})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-3 bg-emergency-light rounded-lg border border-emergency/20">
                <Droplet className="w-6 h-6 text-emergency" />
                <div>
                  <p className="text-sm font-medium text-text-primary">Blood Type</p>
                  <p className="text-2xl font-bold text-emergency">{mockCareRecipient.bloodType}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Allergies - High Visibility */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card variant="urgent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-emergency">
                <AlertTriangle className="w-5 h-5" />
                ALLERGIES
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {mockCareRecipient.allergies.map((allergy) => (
                  <Badge key={allergy} variant="destructive" size="lg" className="text-base font-semibold">
                    {allergy}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Conditions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-accent-warm" />
                Medical Conditions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {mockCareRecipient.conditions.map((condition) => (
                  <li key={condition} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-accent-warm" />
                    <span className="text-text-primary">{condition}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </motion.div>

        {/* Current Medications */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Pill className="w-5 h-5 text-accent-primary" />
                Current Medications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {mockMedications.map((med) => (
                  <li key={med.name} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-text-primary">{med.name} {med.dosage}</p>
                      <p className="text-sm text-text-secondary">{med.frequency}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </motion.div>

        {/* Emergency Contacts */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5 text-success" />
                Emergency Contacts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {mockEmergencyContacts.map((contact) => (
                <div key={contact.name} className="flex items-center justify-between p-3 bg-bg-muted rounded-lg">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-text-primary">{contact.name}</p>
                      {contact.isPrimary && <Badge size="sm" variant="success">Primary</Badge>}
                    </div>
                    <p className="text-sm text-text-secondary">{contact.relationship}</p>
                  </div>
                  <a
                    href={`tel:${contact.phone.replace(/\D/g, '')}`}
                    className="flex items-center gap-2 px-4 py-2 bg-success text-text-inverse rounded-lg font-medium hover:bg-success/90 transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    Call
                  </a>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Doctors */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-info" />
                Doctors
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {mockDoctors.map((doctor) => (
                <div key={doctor.name} className="flex items-center justify-between p-3 bg-bg-muted rounded-lg">
                  <div>
                    <p className="font-medium text-text-primary">{doctor.name}</p>
                    <p className="text-sm text-text-secondary">{doctor.specialty}</p>
                  </div>
                  <a
                    href={`tel:${doctor.phone.replace(/\D/g, '')}`}
                    className="flex items-center gap-2 px-4 py-2 bg-info text-text-inverse rounded-lg font-medium hover:bg-info/90 transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    Call
                  </a>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Insurance */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-chart-purple" />
                Insurance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="font-medium text-text-primary">{mockInsurance.provider}</p>
                <p className="text-sm text-text-secondary">
                  Policy: <span className="font-mono">{mockInsurance.policyNumber}</span>
                </p>
                <p className="text-sm text-text-secondary">
                  Group: <span className="font-mono">{mockInsurance.groupNumber}</span>
                </p>
              </div>
              <Button variant="secondary" size="sm" className="mt-4" leftIcon={<FileText className="w-4 h-4" />}>
                View Insurance Card
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Preferred Hospital */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-accent-warm" />
                Preferred Hospital
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium text-text-primary">{mockHospital.name}</p>
              <p className="text-sm text-text-secondary mt-1">{mockHospital.address}</p>
              <div className="flex gap-2 mt-4">
                <a
                  href={`tel:${mockHospital.phone.replace(/\D/g, '')}`}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-bg-muted text-text-primary rounded-lg font-medium hover:bg-bg-subtle transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  Call
                </a>
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(mockHospital.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-bg-muted text-text-primary rounded-lg font-medium hover:bg-bg-subtle transition-colors"
                >
                  <MapPin className="w-4 h-4" />
                  Directions
                </a>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex gap-3"
        >
          <Button variant="secondary" size="lg" fullWidth leftIcon={<Share2 className="w-5 h-5" />}>
            Share as PDF
          </Button>
          <Button variant="secondary" size="lg" fullWidth leftIcon={<Download className="w-5 h-5" />}>
            Download
          </Button>
        </motion.div>

        {/* Offline Indicator */}
        <div className="flex items-center justify-center gap-2 p-4 bg-success-light rounded-xl">
          <Shield className="w-5 h-5 text-success" />
          <p className="text-sm text-success font-medium">
            This page is saved for offline access
          </p>
        </div>
      </div>
    </div>
  );
}

