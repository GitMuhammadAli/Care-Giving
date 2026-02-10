'use client';

import { useState, memo } from 'react';
import { Pill, Plus, Clock, AlertCircle, CheckCircle2, ChevronRight, RefreshCw } from 'lucide-react';
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
import { useMedications, useTodaysMedications, useCreateMedication, useLogMedication } from '@/hooks/use-medications';
import { Skeleton } from '@/components/ui/skeleton';

// ─── Format helpers ──────────────────────────────────────────────────────────
const FREQUENCY_LABELS: Record<string, string> = {
  DAILY: 'Once daily',
  TWICE_DAILY: 'Twice daily',
  THREE_TIMES_DAILY: '3x daily',
  FOUR_TIMES_DAILY: '4x daily',
  WEEKLY: 'Weekly',
  AS_NEEDED: 'As needed',
  OTHER: 'Other',
};

function formatFrequency(raw: string): string {
  return FREQUENCY_LABELS[raw] || raw.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase());
}

function formatForm(raw: string): string {
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

// ─── Component ───────────────────────────────────────────────────────────────

interface MedicationTrackerProps {
  careRecipientId: string;
}

export const MedicationTracker = memo(function MedicationTracker({ careRecipientId }: MedicationTrackerProps) {
  const { data: medications, isLoading: medicationsLoading } = useMedications(careRecipientId);
  const { data: todaySchedule, isLoading: scheduleLoading } = useTodaysMedications(careRecipientId);
  const createMedication = useCreateMedication(careRecipientId);
  const logMedication = useLogMedication(careRecipientId);

  // Filter low supply medications locally
  const lowSupplyMeds = medications?.filter(
    (med) => med.currentSupply !== undefined && med.refillAt !== undefined && med.currentSupply <= med.refillAt
  );

  const [addOpen, setAddOpen] = useState(false);
  const [newMed, setNewMed] = useState({
    name: '',
    dosage: '',
    form: 'TABLET',
    frequency: 'DAILY',
    time: '',
    prescribedBy: '',
    pharmacy: '',
    instructions: '',
  });

  const isLoading = medicationsLoading || scheduleLoading;

  const handleMarkTaken = async (medicationId: string, scheduledTime: string) => {
    try {
      await logMedication.mutateAsync({
        medicationId,
        data: {
          status: 'GIVEN',
          scheduledTime,
        },
      });
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleAddMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMedication.mutateAsync({
        name: newMed.name,
        dosage: newMed.dosage,
        form: newMed.form,
        frequency: newMed.frequency,
        scheduledTimes: [newMed.time],
        prescribedBy: newMed.prescribedBy || undefined,
        pharmacy: newMed.pharmacy || undefined,
        instructions: newMed.instructions || undefined,
      });
      setNewMed({
        name: '',
        dosage: '',
        form: 'TABLET',
        frequency: 'DAILY',
        time: '',
        prescribedBy: '',
        pharmacy: '',
        instructions: '',
      });
      setAddOpen(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  // ── Loading skeleton ─────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="dashboard-card">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-8 w-16 rounded-xl" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[76px] w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // ── Empty state ──────────────────────────────────────────────────────────
  if (!medications || medications.length === 0) {
    return (
      <div className="dashboard-card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-serif text-xl text-foreground flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center">
              <Pill className="w-4 h-4 text-primary" />
            </div>
            Medications
          </h2>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="ghost" className="text-primary hover:text-primary hover:bg-primary/10 rounded-xl gap-1">
                <Plus className="w-4 h-4" />
                Add
              </Button>
            </DialogTrigger>
            <MedicationFormDialog
              newMed={newMed}
              setNewMed={setNewMed}
              onSubmit={handleAddMedication}
              isLoading={createMedication.isPending}
            />
          </Dialog>
        </div>
        <div className="text-center py-10">
          <div className="w-16 h-16 rounded-2xl bg-sage-100 flex items-center justify-center mx-auto mb-4">
            <Pill className="w-7 h-7 text-sage-400" />
          </div>
          <h3 className="font-serif text-lg text-foreground mb-1.5">No medications yet</h3>
          <p className="text-sm text-muted-foreground mb-5 max-w-xs mx-auto">
            Add medications to track schedules, dosages, and refill reminders
          </p>
          <Button onClick={() => setAddOpen(true)} className="rounded-xl">
            <Plus className="w-4 h-4 mr-2" />
            Add First Medication
          </Button>
        </div>
      </div>
    );
  }

  // ── Main view ────────────────────────────────────────────────────────────
  return (
    <div className="dashboard-card">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-serif text-xl text-foreground flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center">
            <Pill className="w-4 h-4 text-primary" />
          </div>
          Medications
        </h2>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="ghost" className="text-primary hover:text-primary hover:bg-primary/10 rounded-xl gap-1">
              <Plus className="w-4 h-4" />
              Add
            </Button>
          </DialogTrigger>
          <MedicationFormDialog
            newMed={newMed}
            setNewMed={setNewMed}
            onSubmit={handleAddMedication}
            isLoading={createMedication.isPending}
          />
        </Dialog>
      </div>

      {/* Refill Alert */}
      {lowSupplyMeds && lowSupplyMeds.length > 0 && (
        <div className="bg-amber-50 border border-amber-200/60 rounded-xl p-3.5 mb-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
            <RefreshCw className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-800">
              {lowSupplyMeds.length} medication{lowSupplyMeds.length > 1 ? 's' : ''} need refill soon
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-amber-400 shrink-0" />
        </div>
      )}

      {/* Medication List */}
      <div className="space-y-2">
        {todaySchedule && todaySchedule.length > 0 ? (
          todaySchedule.map((item) => {
            const isGiven = item.status === 'GIVEN';
            const isMissed = item.status === 'MISSED';

            return (
              <div
                key={`${item.medication.id}-${item.scheduledTime}`}
                className={`flex items-center gap-3.5 p-3.5 rounded-xl border transition-colors ${
                  isGiven
                    ? 'bg-sage-50/60 border-sage-200/50'
                    : isMissed
                    ? 'bg-red-50/40 border-red-200/40'
                    : 'bg-sage-50/40 border-sage-200/40 hover:bg-sage-100/50 hover:border-sage-300/50'
                }`}
              >
                {/* Icon */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  isGiven
                    ? 'bg-primary/15'
                    : isMissed
                    ? 'bg-red-100'
                    : 'bg-sage-200/60'
                }`}>
                  {isGiven ? (
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                  ) : (
                    <Pill className={`w-5 h-5 ${isMissed ? 'text-red-400' : 'text-sage-500'}`} />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className={`font-medium truncate ${isGiven ? 'text-foreground/60' : 'text-foreground'}`}>
                    {item.medication.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="inline-flex items-center text-xs font-medium text-sage-600 bg-sage-200/50 px-2 py-0.5 rounded-md">
                      {item.medication.dosage}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {item.time}
                    </span>
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      {formatFrequency(item.medication.frequency)}
                    </span>
                  </div>
                </div>

                {/* Action / Status */}
                {item.status === 'PENDING' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleMarkTaken(item.medication.id, item.scheduledTime)}
                    disabled={logMedication.isPending}
                    className="shrink-0 rounded-xl border-sage-300 text-primary hover:bg-primary/10 hover:text-primary hover:border-primary/30 text-xs font-medium"
                  >
                    Mark Taken
                  </Button>
                )}
                {isGiven && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-lg shrink-0">
                    <CheckCircle2 className="w-3 h-3" />
                    Taken
                  </span>
                )}
                {item.status === 'SKIPPED' && (
                  <span className="text-xs font-medium text-muted-foreground bg-sage-100 px-2.5 py-1 rounded-lg shrink-0">
                    Skipped
                  </span>
                )}
                {isMissed && (
                  <span className="text-xs font-medium text-red-600 bg-red-50 px-2.5 py-1 rounded-lg shrink-0">
                    Missed
                  </span>
                )}
              </div>
            );
          })
        ) : (
          // Show all active medications if no schedule
          medications.filter(med => med.isActive).map((med) => (
            <div
              key={med.id}
              className="flex items-center gap-3.5 p-3.5 rounded-xl bg-sage-50/40 border border-sage-200/40 hover:bg-sage-100/50 hover:border-sage-300/50 transition-colors"
            >
              {/* Icon */}
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-sage-200/60 shrink-0">
                <Pill className="w-5 h-5 text-sage-500" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{med.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="inline-flex items-center text-xs font-medium text-sage-600 bg-sage-200/50 px-2 py-0.5 rounded-md">
                    {med.dosage}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {med.scheduledTimes?.[0] || 'As needed'}
                  </span>
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    {formatFrequency(med.frequency)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer link */}
      <button className="w-full mt-4 pt-4 border-t border-sage-200/60 flex items-center justify-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors">
        View Full Medication List
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
});

// ─── Dialog form component ───────────────────────────────────────────────────
function MedicationFormDialog({
  newMed,
  setNewMed,
  onSubmit,
  isLoading,
}: {
  newMed: {
    name: string;
    dosage: string;
    form: string;
    frequency: string;
    time: string;
    prescribedBy: string;
    pharmacy: string;
    instructions: string;
  };
  setNewMed: (med: typeof newMed) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
}) {
  const selectClasses =
    'w-full h-10 px-3 rounded-xl border border-sage-200 bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-colors';

  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle className="font-serif flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center">
            <Pill className="w-4 h-4 text-primary" />
          </div>
          Add Medication
        </DialogTitle>
      </DialogHeader>
      <form onSubmit={onSubmit} className="space-y-4 mt-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">
              Medication Name
            </label>
            <Input
              value={newMed.name}
              onChange={(e) => setNewMed({ ...newMed, name: e.target.value })}
              placeholder="e.g., Aricept"
              required
              className="rounded-xl"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">
              Dosage
            </label>
            <Input
              value={newMed.dosage}
              onChange={(e) => setNewMed({ ...newMed, dosage: e.target.value })}
              placeholder="e.g., 10mg"
              required
              className="rounded-xl"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">
              Form
            </label>
            <select
              value={newMed.form}
              onChange={(e) => setNewMed({ ...newMed, form: e.target.value })}
              className={selectClasses}
              autoComplete="off"
            >
              <option value="TABLET">Tablet</option>
              <option value="CAPSULE">Capsule</option>
              <option value="LIQUID">Liquid</option>
              <option value="INJECTION">Injection</option>
              <option value="PATCH">Patch</option>
              <option value="CREAM">Cream</option>
              <option value="INHALER">Inhaler</option>
              <option value="DROPS">Drops</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">
              Frequency
            </label>
            <select
              value={newMed.frequency}
              onChange={(e) => setNewMed({ ...newMed, frequency: e.target.value })}
              className={selectClasses}
              autoComplete="off"
            >
              <option value="DAILY">Once daily</option>
              <option value="TWICE_DAILY">Twice daily</option>
              <option value="THREE_TIMES_DAILY">Three times daily</option>
              <option value="FOUR_TIMES_DAILY">Four times daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="AS_NEEDED">As needed</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">
              Time
            </label>
            <Input
              type="time"
              value={newMed.time}
              onChange={(e) => setNewMed({ ...newMed, time: e.target.value })}
              required
              className="rounded-xl"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">
              Prescribed By
            </label>
            <Input
              value={newMed.prescribedBy}
              onChange={(e) => setNewMed({ ...newMed, prescribedBy: e.target.value })}
              placeholder="Doctor's name"
              className="rounded-xl"
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">
            Pharmacy
          </label>
          <Input
            value={newMed.pharmacy}
            onChange={(e) => setNewMed({ ...newMed, pharmacy: e.target.value })}
            placeholder="Pharmacy name"
            className="rounded-xl"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">
            Instructions
          </label>
          <Input
            value={newMed.instructions}
            onChange={(e) => setNewMed({ ...newMed, instructions: e.target.value })}
            placeholder="Special instructions..."
            className="rounded-xl"
          />
        </div>
        <Button type="submit" className="w-full rounded-xl" disabled={isLoading}>
          {isLoading ? 'Adding...' : 'Add Medication'}
        </Button>
      </form>
    </DialogContent>
  );
}

