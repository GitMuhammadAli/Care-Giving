'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MedicationCard, MedicationScheduleItem } from '@/components/care/medication-card';
import { EmptyState } from '@/components/ui/empty-state';
import { AddMedicationModal } from '@/components/modals/add-medication-modal';
import { LogMedicationModal } from '@/components/modals/log-medication-modal';
import {
  Plus,
  Pill,
  Clock,
  AlertCircle,
  Package,
} from 'lucide-react';

// Mock data
const mockSchedule: { time: string; label: string; items: MedicationScheduleItem[] }[] = [
  {
    time: 'morning',
    label: 'Morning',
    items: [
      {
        medication: { id: 'med-1', name: 'Metformin', dosage: '500mg', form: 'TABLET', instructions: 'Take with food' },
        scheduledTime: new Date().setHours(8, 0, 0, 0).toString(),
        time: '8:00 AM',
        status: 'GIVEN',
        givenTime: new Date().setHours(8, 15, 0, 0).toString(),
        givenBy: { id: 'u-1', fullName: 'Sarah Thompson' },
      },
      {
        medication: { id: 'med-2', name: 'Aspirin', dosage: '81mg', form: 'TABLET', instructions: '' },
        scheduledTime: new Date().setHours(8, 0, 0, 0).toString(),
        time: '8:00 AM',
        status: 'GIVEN',
        givenTime: new Date().setHours(8, 10, 0, 0).toString(),
        givenBy: { id: 'u-2', fullName: 'Mike Thompson' },
      },
    ],
  },
  {
    time: 'afternoon',
    label: 'Afternoon',
    items: [
      {
        medication: { id: 'med-1', name: 'Metformin', dosage: '500mg', form: 'TABLET', instructions: 'Take with food' },
        scheduledTime: new Date().setHours(14, 0, 0, 0).toString(),
        time: '2:00 PM',
        status: 'PENDING',
      },
    ],
  },
  {
    time: 'evening',
    label: 'Evening',
    items: [
      {
        medication: { id: 'med-1', name: 'Metformin', dosage: '500mg', form: 'TABLET', instructions: 'Take with food' },
        scheduledTime: new Date().setHours(20, 0, 0, 0).toString(),
        time: '8:00 PM',
        status: 'PENDING',
      },
      {
        medication: { id: 'med-3', name: 'Lisinopril', dosage: '10mg', form: 'TABLET', instructions: '' },
        scheduledTime: new Date().setHours(20, 0, 0, 0).toString(),
        time: '8:00 PM',
        status: 'PENDING',
      },
    ],
  },
];

const mockAllMedications = [
  { id: 'med-1', name: 'Metformin', dosage: '500mg', frequency: '3x daily', supply: 45, daysLeft: 15 },
  { id: 'med-2', name: 'Aspirin', dosage: '81mg', frequency: '1x daily', supply: 90, daysLeft: 90 },
  { id: 'med-3', name: 'Lisinopril', dosage: '10mg', frequency: '1x daily', supply: 12, daysLeft: 12, lowSupply: true },
  { id: 'med-4', name: 'Eliquis', dosage: '5mg', frequency: '2x daily', supply: 60, daysLeft: 30 },
];

export default function MedicationsPage() {
  const [view, setView] = useState<'schedule' | 'all'>('schedule');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [logMedicationData, setLogMedicationData] = useState<{
    id: string;
    name: string;
    dosage: string;
    scheduledTime: string;
  } | null>(null);

  // TODO: Get from context/auth
  const careRecipientId = 'cr-1';

  const handleLogMedication = async (medicationId: string, status: 'GIVEN' | 'SKIPPED', skipReason?: string) => {
    // Find the medication and open the log modal
    for (const slot of mockSchedule) {
      const item = slot.items.find((i) => i.medication.id === medicationId);
      if (item) {
        setLogMedicationData({
          id: item.medication.id,
          name: item.medication.name,
          dosage: item.medication.dosage,
          scheduledTime: item.time,
        });
        return;
      }
    }
  };

  return (
    <div className="pb-6">
      <PageHeader
        title="Medications"
        subtitle="Track and manage all medications"
        actions={
          <Button 
            variant="primary" 
            size="default" 
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsAddModalOpen(true)}
          >
            Add Medication
          </Button>
        }
      />

      <div className="px-4 sm:px-6 py-6">
        {/* View Toggle */}
        <div className="flex gap-2 mb-6 p-1 bg-bg-muted rounded-lg w-fit">
          <button
            onClick={() => setView('schedule')}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium transition-all',
              view === 'schedule'
                ? 'bg-bg-surface text-text-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            )}
          >
            <Clock className="w-4 h-4 inline-block mr-2" />
            Today's Schedule
          </button>
          <button
            onClick={() => setView('all')}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium transition-all',
              view === 'all'
                ? 'bg-bg-surface text-text-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            )}
          >
            <Pill className="w-4 h-4 inline-block mr-2" />
            All Medications
          </button>
        </div>

        {view === 'schedule' ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {mockSchedule.map((timeSlot) => (
              <div key={timeSlot.time}>
                <h3 className="text-sm font-semibold text-text-tertiary uppercase tracking-wide mb-3">
                  {timeSlot.label}
                </h3>
                <div className="space-y-3">
                  {timeSlot.items.map((item, index) => (
                    <motion.div
                      key={`${item.medication.id}-${item.time}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <MedicationCard item={item} onLog={handleLogMedication} />
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {/* Low Supply Alert */}
            {mockAllMedications.some((m) => m.lowSupply) && (
              <Card variant="urgent" className="mb-6">
                <CardContent className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-emergency" />
                  <p className="text-sm text-text-primary">
                    <strong>Refill needed:</strong> Some medications are running low on supply.
                  </p>
                </CardContent>
              </Card>
            )}

            <div className="space-y-3">
              {mockAllMedications.map((med, index) => (
                <motion.div
                  key={med.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card variant={med.lowSupply ? 'highlighted' : 'interactive'}>
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        'w-12 h-12 rounded-xl flex items-center justify-center text-2xl',
                        med.lowSupply ? 'bg-warning-light' : 'bg-accent-primary-light'
                      )}>
                        💊
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-text-primary">{med.name}</h4>
                          <Badge size="sm">{med.frequency}</Badge>
                        </div>
                        <p className="text-sm text-text-secondary">{med.dosage}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-sm">
                          <Package className={cn(
                            'w-4 h-4',
                            med.lowSupply ? 'text-warning' : 'text-text-tertiary'
                          )} />
                          <span className={med.lowSupply ? 'text-warning font-medium' : 'text-text-secondary'}>
                            {med.supply} left
                          </span>
                        </div>
                        <p className="text-xs text-text-tertiary mt-0.5">
                          {med.daysLeft} days
                        </p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Add Medication Modal */}
      <AddMedicationModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        careRecipientId={careRecipientId}
      />

      {/* Log Medication Modal */}
      {logMedicationData && (
        <LogMedicationModal
          isOpen={!!logMedicationData}
          onClose={() => setLogMedicationData(null)}
          medication={logMedicationData}
          careRecipientId={careRecipientId}
        />
      )}
    </div>
  );
}

