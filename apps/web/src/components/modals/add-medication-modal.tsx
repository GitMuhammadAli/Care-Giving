'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Clock } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api/client';
import toast from 'react-hot-toast';
import {
  MEDICATION_FREQUENCY_OPTIONS as FREQUENCIES,
  MEDICATION_FORM_OPTIONS as FORMS,
  DEFAULT_MEDICATION_FORM,
  DEFAULT_MEDICATION_FREQUENCY,
} from '@/lib/constants';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  careRecipientId: string;
}

export function AddMedicationModal({ isOpen, onClose, careRecipientId }: Props) {
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

  const mutation = useMutation({
    mutationFn: (data: any) => 
      api.post(`/care-recipients/${careRecipientId}/medications`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications', careRecipientId] });
      toast.success('Medication added successfully');
      onClose();
      resetForm();
    },
    onError: (error: any) => {
      // The API returns { message, errors: { field: ['msg'] } } for validation failures
      const fieldErrors = error?.data?.errors;
      if (fieldErrors && typeof fieldErrors === 'object') {
        const firstError = Object.values(fieldErrors).flat()[0];
        toast.error(typeof firstError === 'string' ? firstError : 'Validation failed. Please check all fields.');
        return;
      }
      const message = error?.data?.message || error?.message || 'Failed to add medication';
      toast.error(typeof message === 'string' ? message : 'Failed to add medication. Please check all required fields.');
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      dosage: '',
      form: 'TABLET',
      frequency: 'DAILY',
      scheduledTimes: ['08:00'],
      instructions: '',
      prescribedBy: '',
      pharmacy: '',
      currentSupply: '',
      refillAt: '15',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Build a clean payload – only include optional fields when they have values.
    // Sending empty strings or null for @IsOptional DTO fields can trip
    // class-validator with forbidNonWhitelisted / transform enabled.
    const payload: Record<string, unknown> = {
      name: formData.name,
      dosage: formData.dosage,
      form: formData.form,
      frequency: formData.frequency,
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Medication" size="lg">
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
            Form <span className="text-destructive">*</span>
          </label>
          <select
            value={formData.form}
            onChange={(e) => setFormData({ ...formData, form: e.target.value })}
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
            Frequency <span className="text-destructive">*</span>
          </label>
          <select
            value={formData.frequency}
            onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
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
            Add Medication
          </Button>
        </div>
      </form>
    </Modal>
  );
}

