'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Clock } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { medicationsApi, Medication } from '@/lib/api';
import toast from 'react-hot-toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  medication: Medication | null;
  careRecipientId: string;
}

const FREQUENCIES = [
  { value: 'once_daily', label: 'Once daily' },
  { value: 'twice_daily', label: 'Twice daily' },
  { value: 'three_times_daily', label: 'Three times daily' },
  { value: 'four_times_daily', label: 'Four times daily' },
  { value: 'every_other_day', label: 'Every other day' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'as_needed', label: 'As needed' },
  { value: 'custom', label: 'Custom schedule' },
];

const FORMS = [
  'Tablet',
  'Capsule',
  'Liquid',
  'Injection',
  'Patch',
  'Cream',
  'Inhaler',
  'Drops',
  'Suppository',
  'Other',
];

export function EditMedicationModal({ isOpen, onClose, medication, careRecipientId }: Props) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    dosage: '',
    form: 'Tablet',
    frequency: 'once_daily',
    scheduledTimes: ['08:00'],
    instructions: '',
    prescribedBy: '',
    pharmacy: '',
    currentSupply: '',
    refillAlertThreshold: '15',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
  });

  useEffect(() => {
    if (medication) {
      setFormData({
        name: medication.name || '',
        dosage: medication.dosage || '',
        form: medication.form || 'Tablet',
        frequency: medication.frequency || 'once_daily',
        scheduledTimes: medication.scheduledTimes?.length > 0 ? medication.scheduledTimes : ['08:00'],
        instructions: medication.instructions || '',
        prescribedBy: medication.prescribedBy || '',
        pharmacy: medication.pharmacy || '',
        currentSupply: medication.currentSupply?.toString() || '',
        refillAlertThreshold: medication.refillAlertThreshold?.toString() || '15',
        startDate: medication.startDate?.split('T')[0] || new Date().toISOString().split('T')[0],
        endDate: medication.endDate?.split('T')[0] || '',
      });
    }
  }, [medication]);

  const mutation = useMutation({
    mutationFn: (data: any) => medicationsApi.update(medication!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications', careRecipientId] });
      queryClient.invalidateQueries({ queryKey: ['medications-schedule', careRecipientId] });
      toast.success('Medication updated successfully');
      onClose();
    },
    onError: () => {
      toast.error('Failed to update medication');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!medication) return;

    mutation.mutate({
      ...formData,
      currentSupply: formData.currentSupply ? parseInt(formData.currentSupply) : null,
      refillAlertThreshold: formData.refillAlertThreshold ? parseInt(formData.refillAlertThreshold) : null,
      endDate: formData.endDate || null,
    });
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
            label="Medication Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Metformin"
            required
          />
          <Input
            label="Dosage"
            value={formData.dosage}
            onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
            placeholder="e.g., 500mg"
            required
          />
        </div>

        {/* Form */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Form
          </label>
          <select
            value={formData.form}
            onChange={(e) => setFormData({ ...formData, form: e.target.value })}
            className="w-full px-4 py-3 rounded-lg border border-border bg-bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 focus:border-accent-primary"
          >
            {FORMS.map((form) => (
              <option key={form} value={form}>{form}</option>
            ))}
          </select>
        </div>

        {/* Frequency */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Frequency
          </label>
          <select
            value={formData.frequency}
            onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
            className="w-full px-4 py-3 rounded-lg border border-border bg-bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 focus:border-accent-primary"
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
            value={formData.refillAlertThreshold}
            onChange={(e) => setFormData({ ...formData, refillAlertThreshold: e.target.value })}
            placeholder="e.g., 15"
          />
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Start Date"
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
