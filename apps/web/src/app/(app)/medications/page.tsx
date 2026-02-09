'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MedicationCard, MedicationScheduleItem } from '@/components/care/medication-card';
import { EmptyState } from '@/components/ui/empty-state';
import { AddMedicationModal } from '@/components/modals/add-medication-modal';
import { EditMedicationModal } from '@/components/modals/edit-medication-modal';
import { LogMedicationModal } from '@/components/modals/log-medication-modal';
import { FamilySpaceSelector } from '@/components/layout/family-space-selector';
import { useFamilySpace } from '@/contexts/family-space-context';
import { medicationsApi, Medication, MedicationScheduleItem as ApiScheduleItem } from '@/lib/api';
import {
  Plus,
  Pill,
  Clock,
  AlertCircle,
  Package,
  Pencil,
  Trash2,
} from 'lucide-react';

// Format enum values for display
const frequencyLabels: Record<string, string> = {
  DAILY: 'Daily',
  TWICE_DAILY: 'Twice daily',
  THREE_TIMES_DAILY: '3x daily',
  FOUR_TIMES_DAILY: '4x daily',
  WEEKLY: 'Weekly',
  AS_NEEDED: 'As needed',
  OTHER: 'Other',
};

const formLabels: Record<string, string> = {
  TABLET: 'Tablet',
  CAPSULE: 'Capsule',
  LIQUID: 'Liquid',
  INJECTION: 'Injection',
  PATCH: 'Patch',
  CREAM: 'Cream',
  INHALER: 'Inhaler',
  DROPS: 'Drops',
  OTHER: 'Other',
};

// Group schedule items by time of day
function groupScheduleByTimeOfDay(items: ApiScheduleItem[]): { time: string; label: string; items: MedicationScheduleItem[] }[] {
  const morning: MedicationScheduleItem[] = [];
  const afternoon: MedicationScheduleItem[] = [];
  const evening: MedicationScheduleItem[] = [];

  for (const item of items) {
    const hour = parseInt(item.time.split(':')[0], 10);
    const scheduleItem: MedicationScheduleItem = {
      medication: {
        id: item.medication.id,
        name: item.medication.name,
        dosage: item.medication.dosage,
        form: item.medication.form,
        instructions: item.medication.instructions || '',
      },
      scheduledTime: item.scheduledTime,
      time: item.time,
      status: item.status,
      givenTime: item.givenTime,
      givenBy: item.givenBy,
    };

    if (hour < 12) {
      morning.push(scheduleItem);
    } else if (hour < 17) {
      afternoon.push(scheduleItem);
    } else {
      evening.push(scheduleItem);
    }
  }

  const result: { time: string; label: string; items: MedicationScheduleItem[] }[] = [];
  if (morning.length > 0) result.push({ time: 'morning', label: 'Morning', items: morning });
  if (afternoon.length > 0) result.push({ time: 'afternoon', label: 'Afternoon', items: afternoon });
  if (evening.length > 0) result.push({ time: 'evening', label: 'Evening', items: evening });
  
  return result;
}

export default function MedicationsPage() {
  const { selectedCareRecipientId: careRecipientId, selectedCareRecipient, currentRole } = useFamilySpace();
  const queryClient = useQueryClient();

  // Role-based permissions
  const canEdit = currentRole === 'ADMIN' || currentRole === 'CAREGIVER';
  const canDelete = currentRole === 'ADMIN';

  const [view, setView] = useState<'schedule' | 'all'>('schedule');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedMedication, setSelectedMedication] = useState<Medication | null>(null);
  const [logMedicationData, setLogMedicationData] = useState<{
    id: string;
    name: string;
    dosage: string;
    scheduledTime: string;
  } | null>(null);

  // Fetch today's schedule
  const { data: scheduleItems = [], isLoading: isScheduleLoading } = useQuery({
    queryKey: ['medications-schedule', careRecipientId],
    queryFn: () => medicationsApi.getTodaySchedule(careRecipientId!),
    enabled: !!careRecipientId,
  });

  // Fetch all medications
  const { data: allMedications = [], isLoading: isMedicationsLoading } = useQuery({
    queryKey: ['medications', careRecipientId],
    queryFn: () => medicationsApi.list(careRecipientId!),
    enabled: !!careRecipientId,
  });

  // Delete medication mutation
  const deleteMedicationMutation = useMutation({
    mutationFn: (id: string) => medicationsApi.delete(careRecipientId!, id),
    onSuccess: () => {
      toast.success('Medication deleted');
      queryClient.invalidateQueries({ queryKey: ['medications', careRecipientId] });
      queryClient.invalidateQueries({ queryKey: ['medications-schedule', careRecipientId] });
    },
    onError: () => {
      toast.error('Failed to delete medication');
    },
  });

  const handleEditMedication = (med: Medication) => {
    setSelectedMedication(med);
    setIsEditModalOpen(true);
  };

  const handleDeleteMedication = (med: Medication) => {
    if (confirm(`Are you sure you want to delete ${med.name}?`)) {
      deleteMedicationMutation.mutate(med.id);
    }
  };

  // Group schedule by time of day
  const groupedSchedule = useMemo(() => groupScheduleByTimeOfDay(scheduleItems), [scheduleItems]);

  // Calculate supply info
  const medicationsWithSupply = useMemo(() => {
    return allMedications.map(med => {
      const dosesPerDay = med.scheduledTimes?.length || 1;
      const daysLeft = med.currentSupply ? Math.floor(med.currentSupply / dosesPerDay) : undefined;
      const lowSupply = med.refillAt && med.currentSupply
        ? med.currentSupply <= med.refillAt
        : false;
      return { ...med, daysLeft, lowSupply };
    });
  }, [allMedications]);

  const handleLogMedication = async (medicationId: string, status: 'GIVEN' | 'SKIPPED', skipReason?: string) => {
    // Find the medication and open the log modal
    for (const slot of groupedSchedule) {
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

  const isLoading = view === 'schedule' ? isScheduleLoading : isMedicationsLoading;

  if (!careRecipientId) {
    return (
      <div className="pb-6">
        <PageHeader title="Medications" subtitle="Track and manage all medications" />
        <div className="px-4 sm:px-6 py-6">
          <FamilySpaceSelector />
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-warning mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-text-primary mb-2">No Loved One Selected</h2>
            <p className="text-text-secondary">Please select a loved one above to view their medications.</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="pb-6">
        <PageHeader title="Medications" subtitle="Track and manage all medications" />
        <div className="px-4 sm:px-6 py-6 space-y-4">
          <FamilySpaceSelector />
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="pb-6">
      <PageHeader
        title="Medications"
        subtitle="Track and manage all medications"
        actions={
          canEdit ? (
            <Button
              variant="primary"
              size="default"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setIsAddModalOpen(true)}
            >
              Add Medication
            </Button>
          ) : null
        }
      />

      <div className="px-4 sm:px-6 py-6">
        {/* Family Space Selector */}
        <FamilySpaceSelector />

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
            {groupedSchedule.length === 0 ? (
              <EmptyState
                type="medications"
                title="No medications scheduled today"
                description={canEdit ? "Add medications to start tracking the daily schedule." : "No medications have been added yet."}
                actionLabel={canEdit ? "Add Medication" : undefined}
                onAction={canEdit ? () => setIsAddModalOpen(true) : undefined}
              />
            ) : (
              groupedSchedule.map((timeSlot) => (
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
              ))
            )}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {/* Low Supply Alert */}
            {medicationsWithSupply.some((m) => m.lowSupply) && (
              <Card variant="urgent" className="mb-6">
                <CardContent className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-emergency" />
                  <p className="text-sm text-text-primary">
                    <strong>Refill needed:</strong> Some medications are running low on supply.
                  </p>
                </CardContent>
              </Card>
            )}

            {medicationsWithSupply.length === 0 ? (
              <EmptyState
                type="medications"
                title="No medications yet"
                description={canEdit ? "Add medications to track dosages and schedules." : "No medications have been added yet."}
                actionLabel={canEdit ? "Add Medication" : undefined}
                onAction={canEdit ? () => setIsAddModalOpen(true) : undefined}
              />
            ) : (
              <div className="space-y-3">
                {medicationsWithSupply.map((med, index) => (
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
                            <Badge size="sm">{frequencyLabels[med.frequency] || med.frequency}</Badge>
                          </div>
                          <p className="text-sm text-text-secondary">{med.dosage}</p>
                          {med.instructions && (
                            <p className="text-xs text-text-tertiary mt-1">{med.instructions}</p>
                          )}
                        </div>
                        {med.currentSupply !== undefined && (
                          <div className="text-right mr-2">
                            <div className="flex items-center gap-1 text-sm">
                              <Package className={cn(
                                'w-4 h-4',
                                med.lowSupply ? 'text-warning' : 'text-text-tertiary'
                              )} />
                              <span className={med.lowSupply ? 'text-warning font-medium' : 'text-text-secondary'}>
                                {med.currentSupply} left
                              </span>
                            </div>
                            {med.daysLeft !== undefined && (
                              <p className="text-xs text-text-tertiary mt-0.5">
                                ~{med.daysLeft} days
                              </p>
                            )}
                          </div>
                        )}
                        {(canEdit || canDelete) && (
                          <div className="flex items-center gap-1">
                            {canEdit && (
                              <button
                                onClick={() => handleEditMedication(med)}
                                className="p-2 rounded-lg text-text-tertiary hover:text-primary hover:bg-primary/10 transition-colors"
                                title="Edit"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => handleDeleteMedication(med)}
                                disabled={deleteMedicationMutation.isPending}
                                className="p-2 rounded-lg text-text-tertiary hover:text-destructive hover:bg-destructive/10 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Add Medication Modal */}
      <AddMedicationModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          queryClient.invalidateQueries({ queryKey: ['medications', careRecipientId] });
        }}
        careRecipientId={careRecipientId}
      />

      {/* Log Medication Modal */}
      {logMedicationData && (
        <LogMedicationModal
          isOpen={!!logMedicationData}
          onClose={() => {
            setLogMedicationData(null);
            queryClient.invalidateQueries({ queryKey: ['medications-schedule', careRecipientId] });
          }}
          medication={logMedicationData}
          careRecipientId={careRecipientId}
        />
      )}

      {/* Edit Medication Modal */}
      {careRecipientId && (
        <EditMedicationModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedMedication(null);
          }}
          medication={selectedMedication}
          careRecipientId={careRecipientId}
        />
      )}
    </div>
  );
}

