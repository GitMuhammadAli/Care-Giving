'use client';

import { useState, memo } from 'react';
import { Pill, Plus, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
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
import { useMedications, useTodaysMedications, useLowSupplyMedications, useCreateMedication, useLogMedication } from '@/hooks/use-medications';
import { Skeleton } from '@/components/ui/skeleton';

interface MedicationTrackerProps {
  careRecipientId: string;
}

export const MedicationTracker = memo(function MedicationTracker({ careRecipientId }: MedicationTrackerProps) {
  const { data: medications, isLoading: medicationsLoading } = useMedications(careRecipientId);
  const { data: todaySchedule, isLoading: scheduleLoading } = useTodaysMedications(careRecipientId);
  const { data: lowSupplyMeds } = useLowSupplyMedications(careRecipientId);
  const createMedication = useCreateMedication(careRecipientId);
  const logMedication = useLogMedication(careRecipientId);

  const [addOpen, setAddOpen] = useState(false);
  const [newMed, setNewMed] = useState({
    name: '',
    dosage: '',
    form: 'tablet',
    frequency: 'Once daily',
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
        form: 'tablet',
        frequency: 'Once daily',
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

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-16" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (!medications || medications.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-serif text-xl text-foreground flex items-center gap-2">
            <Pill className="w-5 h-5 text-primary" />
            Medications
          </h2>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="ghost" className="text-primary hover:text-primary hover:bg-primary/10">
                <Plus className="w-4 h-4 mr-1" />
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
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Pill className="w-8 h-8 text-primary/60" />
          </div>
          <h3 className="font-medium text-foreground mb-2">No medications yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Add medications to track schedules and reminders</p>
          <Button onClick={() => setAddOpen(true)} className="rounded-xl">
            <Plus className="w-4 h-4 mr-2" />
            Add First Medication
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-serif text-xl text-foreground flex items-center gap-2">
          <Pill className="w-5 h-5 text-primary" />
          Medications
        </h2>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="ghost" className="text-primary hover:text-primary hover:bg-primary/10">
              <Plus className="w-4 h-4 mr-1" />
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

      {/* Refill Alerts */}
      {lowSupplyMeds && lowSupplyMeds.length > 0 && (
        <div className="bg-secondary/10 border border-secondary/20 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2 text-secondary-foreground">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">
              {lowSupplyMeds.length} medication{lowSupplyMeds.length > 1 ? 's' : ''} need refill soon
            </span>
          </div>
        </div>
      )}

      {/* Medication Schedule List */}
      <div className="space-y-3">
        {todaySchedule && todaySchedule.length > 0 ? (
          todaySchedule.map((item) => (
            <div
              key={`${item.medication.id}-${item.scheduledTime}`}
              className="flex items-center gap-4 p-4 rounded-lg bg-accent/50 hover:bg-accent transition-colors border border-transparent hover:border-border"
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                item.status === 'GIVEN' ? 'bg-primary/20' : 'bg-secondary/20'
              }`}>
                {item.status === 'GIVEN' ? (
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                ) : (
                  <Pill className="w-5 h-5 text-secondary-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground truncate">{item.medication.name}</p>
                  <span className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">
                    {item.medication.dosage}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {item.time}
                  </span>
                  <span>{item.medication.frequency}</span>
                </div>
              </div>
              {item.status === 'PENDING' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleMarkTaken(item.medication.id, item.scheduledTime)}
                  disabled={logMedication.isPending}
                  className="shrink-0 border-border hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                >
                  Mark Taken
                </Button>
              )}
              {item.status === 'GIVEN' && (
                <span className="text-xs text-primary font-medium">✓ Taken</span>
              )}
              {item.status === 'SKIPPED' && (
                <span className="text-xs text-muted-foreground">Skipped</span>
              )}
              {item.status === 'MISSED' && (
                <span className="text-xs text-destructive font-medium">Missed</span>
              )}
            </div>
          ))
        ) : (
          // Show all medications if no schedule for today
          medications.filter(med => med.isActive).map((med) => (
            <div
              key={med.id}
              className="flex items-center gap-4 p-4 rounded-lg bg-accent/50 hover:bg-accent transition-colors border border-transparent hover:border-border"
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-secondary/20">
                <Pill className="w-5 h-5 text-secondary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground truncate">{med.name}</p>
                  <span className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">{med.dosage}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {med.scheduledTimes[0] || 'As needed'}
                  </span>
                  <span>{med.frequency}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <Button variant="ghost" className="w-full mt-4 text-primary hover:text-primary hover:bg-primary/10">
        View Full Medication List
      </Button>
    </div>
  );
});

// Separate dialog form component
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
  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle className="font-serif">Add Medication</DialogTitle>
      </DialogHeader>
      <form onSubmit={onSubmit} className="space-y-4 mt-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">Medication Name</label>
            <Input
              value={newMed.name}
              onChange={(e) => setNewMed({ ...newMed, name: e.target.value })}
              placeholder="e.g., Aricept"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">Dosage</label>
            <Input
              value={newMed.dosage}
              onChange={(e) => setNewMed({ ...newMed, dosage: e.target.value })}
              placeholder="e.g., 10mg"
              required
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">Form</label>
            <select
              value={newMed.form}
              onChange={(e) => setNewMed({ ...newMed, form: e.target.value })}
              className="w-full h-10 px-3 rounded-md border border-border bg-background text-foreground"
            >
              <option value="tablet">Tablet</option>
              <option value="capsule">Capsule</option>
              <option value="liquid">Liquid</option>
              <option value="injection">Injection</option>
              <option value="patch">Patch</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">Frequency</label>
            <select
              value={newMed.frequency}
              onChange={(e) => setNewMed({ ...newMed, frequency: e.target.value })}
              className="w-full h-10 px-3 rounded-md border border-border bg-background text-foreground"
            >
              <option>Once daily</option>
              <option>Twice daily</option>
              <option>Three times daily</option>
              <option>As needed</option>
              <option>Weekly</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">Time</label>
            <Input
              type="time"
              value={newMed.time}
              onChange={(e) => setNewMed({ ...newMed, time: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">Prescribed By</label>
            <Input
              value={newMed.prescribedBy}
              onChange={(e) => setNewMed({ ...newMed, prescribedBy: e.target.value })}
              placeholder="Doctor's name"
            />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-foreground block mb-2">Pharmacy</label>
          <Input
            value={newMed.pharmacy}
            onChange={(e) => setNewMed({ ...newMed, pharmacy: e.target.value })}
            placeholder="Pharmacy name"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground block mb-2">Instructions</label>
          <Input
            value={newMed.instructions}
            onChange={(e) => setNewMed({ ...newMed, instructions: e.target.value })}
            placeholder="Special instructions..."
          />
        </div>
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Adding...' : 'Add Medication'}
        </Button>
      </form>
    </DialogContent>
  );
}

