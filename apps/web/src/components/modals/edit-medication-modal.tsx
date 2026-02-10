'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Clock } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { medicationsApi, Medication } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  MEDICATION_FREQUENCY_OPTIONS as FREQUENCIES,
  MEDICATION_FORM_OPTIONS as FORMS,
  DEFAULT_MEDICATION_FORM,
  DEFAULT_MEDICATION_FREQUENCY,
} from '@/lib/constants';

// ─── Enum normalization (label/lowercase → Prisma enum) ──────────────────────
const FORM_LOOKUP: Record<string, string> = {};
for (const f of FORMS) {
  FORM_LOOKUP[f.value] = f.value;
  FORM_LOOKUP[f.value.toLowerCase()] = f.value;
  FORM_LOOKUP[f.label] = f.value;
  FORM_LOOKUP[f.label.toLowerCase()] = f.value;
}
const FREQ_LOOKUP: Record<string, string> = {};
for (const f of FREQUENCIES) {
  FREQ_LOOKUP[f.value] = f.value;
  FREQ_LOOKUP[f.value.toLowerCase()] = f.value;
  FREQ_LOOKUP[f.label] = f.value;
  FREQ_LOOKUP[f.label.toLowerCase()] = f.value;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  medication: Medication | null;
  careRecipientId: string;
}

export function EditMedicationModal({ isOpen, onClose, medication, careRecipientId }: Props) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    dosage: '',
    form: DEFAULT_MEDICATION_FORM,
    frequency: DEFAULT_MEDICATION_FREQUENCY,
    scheduledTimes: ['08:00'],
    instructions: '',
    prescribedBy: '',
    pharmacy: '',
    currentSupply: '',
    refillAt: '15',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
  });

  useEffect(() => {
    if (medication) {
      setFormData({
        name: medication.name || '',
        dosage: medication.dosage || '',
        form: medication.form || 'TABLET',
        frequency: medication.frequency || 'DAILY',
        scheduledTimes: medication.scheduledTimes?.length > 0 ? medication.scheduledTimes : ['08:00'],
        instructions: medication.instructions || '',
        prescribedBy: medication.prescribedBy || '',
        pharmacy: medication.pharmacy || '',
        currentSupply: medication.currentSupply?.toString() || '',
        refillAt: medication.refillAt?.toString() || '15',
        startDate: medication.startDate?.split('T')[0] || new Date().toISOString().split('T')[0],
        endDate: medication.endDate?.split('T')[0] || '',
      });
    }
  }, [medication]);

  const mutation = useMutation({
    mutationFn: (data: any) => medicationsApi.update(careRecipientId, medication!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications', careRecipientId] });
      queryClient.invalidateQueries({ queryKey: ['medications-schedule', careRecipientId] });
      toast.success('Medication updated successfully');
      onClose();
    },
    onError: (error: any) => {
      console.error('[EditMedication] API error:', JSON.stringify(error?.data || error, null, 2));

      const apiErrors = error?.data?.errors;
      if (apiErrors && typeof apiErrors === 'object' && Object.keys(apiErrors).length > 0) {
        const errorLines = Object.entries(apiErrors)
          .map(([field, msgs]) => `• ${field}: ${Array.isArray(msgs) ? (msgs as string[]).join('; ') : msgs}`)
          .filter(Boolean);
        if (errorLines.length > 0) {
          toast.error(
            `Validation errors:\n${errorLines.join('\n')}`,
            { duration: 8000, style: { whiteSpace: 'pre-line', textAlign: 'left' } },
          );
          return;
        }
      }
      const apiMessage = error?.data?.message || error?.message;
      const message = typeof apiMessage === 'string' && apiMessage !== 'Validation failed'
        ? apiMessage
        : 'Failed to update medication. Please check all fields are filled correctly.';
      toast.error(message, { duration: 6000 });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!medication) return;

    const payload: Record<string, unknown> = {
      name: formData.name.trim(),
      dosage: formData.dosage.trim(),
      form: FORM_LOOKUP[formData.form] || FORM_LOOKUP[formData.form.toLowerCase()] || formData.form,
      frequency: FREQ_LOOKUP[formData.frequency] || FREQ_LOOKUP[formData.frequency.toLowerCase()] || formData.frequency,
    };

    if (formData.scheduledTimes.length > 0) {
      payload.scheduledTimes = formData.scheduledTimes;
    }
    if (formData.instructions.trim()) {
      payload.instructions = formData.instructions.trim();
    }
    if (formData.prescribedBy.trim()) {
      payload.prescribedBy = formData.prescribedBy.trim();
    }
    if (formData.pharmacy.trim()) {
      payload.pharmacy = formData.pharmacy.trim();
    }
    if (formData.currentSupply) {
      payload.currentSupply = parseInt(formData.currentSupply);
    }
    if (formData.refillAt) {
      payload.refillAt = parseInt(formData.refillAt);
    }
    if (formData.startDate) {
      payload.startDate = formData.startDate;
    }
    if (formData.endDate) {
      payload.endDate = formData.endDate;
    }

    mutation.mutate(payload);
  };

  const addTime = () => {
    setFormData({
      ...formData,
      scheduledTimes: [...formData.scheduledTimes, '12:00'],
    });
  };

  const removeTime = (index: number) => {
    setFormData({
      ...formData,
      scheduledTimes: formData.scheduledTimes.filter((_, i) => i !== index),
    });
  };

  const updateTime = (index: number, value: string) => {
    const times = [...formData.scheduledTimes];
    times[index] = value;
    setFormData({ ...formData, scheduledTimes: times });
  };

  if (!medication) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Medication" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Medication Name *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Metformin"
            required
          />
          <Input
            label="Dosage *"
            value={formData.dosage}
            onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
            placeholder="e.g., 500mg"
            required
          />
        </div>

        {/* Form */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Form <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <select
            value={formData.form}
            onChange={(e) => {
              const raw = e.target.value;
              setFormData({ ...formData, form: FORM_LOOKUP[raw] || FORM_LOOKUP[raw.toLowerCase()] || raw });
            }}
            autoComplete="off"
            className="w-full px-4 py-3 rounded-lg border border-border bg-bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 focus:border-accent-primary"
            required
          >
            {FORMS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>

        {/* Frequency */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Frequency <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <select
            value={formData.frequency}
            onChange={(e) => {
              const raw = e.target.value;
              setFormData({ ...formData, frequency: FREQ_LOOKUP[raw] || FREQ_LOOKUP[raw.toLowerCase()] || raw });
            }}
            autoComplete="off"
            className="w-full px-4 py-3 rounded-lg border border-border bg-bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 focus:border-accent-primary"
            required
          >
            {FREQUENCIES.map((freq) => (
              <option key={freq.value} value={freq.value}>{freq.label}</option>
            ))}
          </select>
        </div>

        {/* Scheduled Times */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            <Clock className="w-4 h-4 inline mr-1" />
            Scheduled Times
          </label>
          <div className="space-y-2">
            {formData.scheduledTimes.map((time, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="time"
                  value={time}
                  onChange={(e) => updateTime(index, e.target.value)}
                  className="flex-1 px-4 py-2 rounded-lg border border-border bg-bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 focus:border-accent-primary"
                />
                {formData.scheduledTimes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTime(index)}
                    className="p-2 text-error hover:bg-error-light rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            <Button type="button" variant="ghost" size="sm" onClick={addTime}>
              <Plus className="w-4 h-4 mr-1" />
              Add Time
            </Button>
          </div>
        </div>

        {/* Instructions */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Instructions
          </label>
          <textarea
            value={formData.instructions}
            onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
            className="w-full px-4 py-3 rounded-lg border border-border bg-bg-surface text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 focus:border-accent-primary resize-none"
            rows={2}
            placeholder="e.g., Take with food"
          />
        </div>

        {/* Prescribed By & Pharmacy */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Prescribed By"
            value={formData.prescribedBy}
            onChange={(e) => setFormData({ ...formData, prescribedBy: e.target.value })}
            placeholder="Doctor's name"
          />
          <Input
            label="Pharmacy"
            value={formData.pharmacy}
            onChange={(e) => setFormData({ ...formData, pharmacy: e.target.value })}
            placeholder="Pharmacy name"
          />
        </div>

        {/* Supply Tracking */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Current Supply (pills/doses)"
            type="number"
            value={formData.currentSupply}
            onChange={(e) => setFormData({ ...formData, currentSupply: e.target.value })}
            placeholder="e.g., 90"
          />
          <Input
            label="Refill Alert At"
            type="number"
            value={formData.refillAt}
            onChange={(e) => setFormData({ ...formData, refillAt: e.target.value })}
            placeholder="e.g., 15"
          />
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Start Date *"
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            required
          />
          <Input
            label="End Date (optional)"
            type="date"
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={mutation.isPending}>
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}
