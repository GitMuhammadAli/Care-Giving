'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Clock, AlertCircle } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api/client';
import { cn } from '@/lib/utils';
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

type FieldErrors = Record<string, string>;

// ─── Enum normalization ───────────────────────────────────────────────────────
// Build lookup maps so we can convert any variation (label, lowercase, value)
// back to the correct Prisma enum value the API expects.

const FORM_VALUE_SET = new Set(FORMS.map((f) => f.value));
const FORM_LOOKUP: Record<string, string> = {};
for (const f of FORMS) {
  FORM_LOOKUP[f.value] = f.value;                        // "LIQUID" -> "LIQUID"
  FORM_LOOKUP[f.value.toLowerCase()] = f.value;          // "liquid" -> "LIQUID"
  FORM_LOOKUP[f.label] = f.value;                        // "Liquid" -> "LIQUID"
  FORM_LOOKUP[f.label.toLowerCase()] = f.value;          // "liquid" -> "LIQUID"
  FORM_LOOKUP[f.label.toUpperCase()] = f.value;          // "LIQUID" -> "LIQUID"
}

const FREQ_VALUE_SET = new Set(FREQUENCIES.map((f) => f.value));
const FREQ_LOOKUP: Record<string, string> = {};
for (const f of FREQUENCIES) {
  FREQ_LOOKUP[f.value] = f.value;                        // "DAILY" -> "DAILY"
  FREQ_LOOKUP[f.value.toLowerCase()] = f.value;          // "daily" -> "DAILY"
  FREQ_LOOKUP[f.label] = f.value;                        // "Once daily" -> "DAILY"
  FREQ_LOOKUP[f.label.toLowerCase()] = f.value;          // "once daily" -> "DAILY"
  FREQ_LOOKUP[f.label.toUpperCase()] = f.value;          // "ONCE DAILY" -> "DAILY"
}

/** Resolve a form value to the correct Prisma enum, or return null if invalid */
function resolveForm(raw: unknown): string | null {
  if (!raw || typeof raw !== 'string') return null;
  return FORM_LOOKUP[raw] || FORM_LOOKUP[raw.trim()] || null;
}

/** Resolve a frequency value to the correct Prisma enum, or return null if invalid */
function resolveFrequency(raw: unknown): string | null {
  if (!raw || typeof raw !== 'string') return null;
  return FREQ_LOOKUP[raw] || FREQ_LOOKUP[raw.trim()] || null;
}

// ─── Client-side validation ───────────────────────────────────────────────────

function validateMedication(data: Record<string, unknown>): FieldErrors {
  const errors: FieldErrors = {};

  // Required fields
  if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
    errors.name = 'Medication name is required';
  } else if (data.name.trim().length < 2) {
    errors.name = 'Medication name must be at least 2 characters';
  }

  if (!data.dosage || typeof data.dosage !== 'string' || !data.dosage.trim()) {
    errors.dosage = 'Dosage is required (e.g., 500mg, 10ml)';
  }

  if (!resolveForm(data.form)) {
    errors.form = 'Please select a valid medication form';
  }

  if (!resolveFrequency(data.frequency)) {
    errors.frequency = 'Please select a valid frequency';
  }

  // Optional numeric fields
  if (data.currentSupply !== undefined) {
    const supply = Number(data.currentSupply);
    if (isNaN(supply) || supply < 0 || !Number.isInteger(supply)) {
      errors.currentSupply = 'Current supply must be a whole number (0 or more)';
    }
  }

  if (data.refillAt !== undefined) {
    const refill = Number(data.refillAt);
    if (isNaN(refill) || refill < 0 || !Number.isInteger(refill)) {
      errors.refillAt = 'Refill alert must be a whole number (0 or more)';
    }
  }

  // Date validation
  if (data.startDate && typeof data.startDate === 'string') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.startDate)) {
      errors.startDate = 'Start date must be a valid date (YYYY-MM-DD)';
    }
  }

  if (data.endDate && typeof data.endDate === 'string') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.endDate)) {
      errors.endDate = 'End date must be a valid date (YYYY-MM-DD)';
    }
    if (data.startDate && data.endDate < data.startDate) {
      errors.endDate = 'End date must be after start date';
    }
  }

  // Scheduled times
  if (data.scheduledTimes && Array.isArray(data.scheduledTimes)) {
    const invalid = (data.scheduledTimes as string[]).some((t) => !t || !/^\d{2}:\d{2}$/.test(t));
    if (invalid) {
      errors.scheduledTimes = 'Please set a valid time for each scheduled slot';
    }
  }

  return errors;
}

// ─── Parse API errors into readable messages ──────────────────────────────────

function parseApiErrors(error: any): { fieldErrors: FieldErrors; message: string } {
  const fieldErrors: FieldErrors = {};
  let message = '';

  // Try to extract structured field errors from the API response
  const apiErrors = error?.data?.errors;

  if (apiErrors && typeof apiErrors === 'object' && Object.keys(apiErrors).length > 0) {
    // API returns { errors: { field: ['msg1', 'msg2'] } }
    for (const [field, msgs] of Object.entries(apiErrors)) {
      if (Array.isArray(msgs) && msgs.length > 0) {
        fieldErrors[field] = (msgs as string[]).join('; ');
      } else if (typeof msgs === 'string') {
        fieldErrors[field] = msgs;
      }
    }
    const errorList = Object.entries(fieldErrors)
      .map(([field, msg]) => `${field}: ${msg}`)
      .join('\n');
    message = errorList || 'Validation failed. Please check the form fields.';
  } else {
    // Fallback to message field
    const apiMessage = error?.data?.message || error?.message;
    if (typeof apiMessage === 'string' && apiMessage !== 'Validation failed') {
      message = apiMessage;
    } else if (apiMessage === 'Validation failed') {
      message = 'The server rejected the data. Please check all required fields are filled correctly.';
    } else {
      message = 'Failed to add medication. Please try again.';
    }
  }

  return { fieldErrors, message };
}

// ─── Component ────────────────────────────────────────────────────────────────

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
  const [errors, setErrors] = useState<FieldErrors>({});

  const clearFieldError = (field: string) => {
    if (errors[field]) {
      setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
    }
  };

  const mutation = useMutation({
    mutationFn: (data: any) => 
      api.post(`/care-recipients/${careRecipientId}/medications`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications', careRecipientId] });
      toast.success('Medication added successfully!');
      onClose();
      resetForm();
    },
    onError: (error: any) => {
      console.error('[AddMedication] Full API error:', error);
      console.error('[AddMedication] Error data:', JSON.stringify(error?.data || error, null, 2));

      const { fieldErrors, message } = parseApiErrors(error);

      // Merge API field errors into the form error state
      if (Object.keys(fieldErrors).length > 0) {
        setErrors((prev) => ({ ...prev, ...fieldErrors }));
        // Show a summary toast with all errors
        const errorLines = Object.entries(fieldErrors).map(([f, m]) => `• ${f}: ${m}`);
        toast.error(
          `Validation errors:\n${errorLines.join('\n')}`,
          { duration: 8000, style: { whiteSpace: 'pre-line', textAlign: 'left' } },
        );
      } else {
        toast.error(message, { duration: 6000 });
      }
    },
  });

  const resetForm = () => {
    setFormData({
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
    setErrors({});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Normalize enum values — resolve labels/lowercase back to Prisma enum values.
    // This protects against browser quirks or cached old builds sending wrong values.
    const normalizedForm = resolveForm(formData.form) || formData.form;
    const normalizedFreq = resolveFrequency(formData.frequency) || formData.frequency;

    // Build a clean payload – only include optional fields when they have values.
    const payload: Record<string, unknown> = {
      name: formData.name.trim(),
      dosage: formData.dosage.trim(),
      form: normalizedForm,
      frequency: normalizedFreq,
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
    if (formData.currentSupply && formData.currentSupply.trim()) {
      const parsed = parseInt(formData.currentSupply, 10);
      if (!isNaN(parsed)) payload.currentSupply = parsed;
    }
    if (formData.refillAt && formData.refillAt.trim()) {
      const parsed = parseInt(formData.refillAt, 10);
      if (!isNaN(parsed)) payload.refillAt = parsed;
    }
    if (formData.startDate) {
      payload.startDate = formData.startDate;
    }
    if (formData.endDate) {
      payload.endDate = formData.endDate;
    }

    // Run client-side validation
    const validationErrors = validateMedication(payload);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      // Show toast with all validation errors
      const errorLines = Object.values(validationErrors).map((m) => `• ${m}`);
      toast.error(
        `Please fix the following:\n${errorLines.join('\n')}`,
        { duration: 6000, style: { whiteSpace: 'pre-line', textAlign: 'left' } },
      );
      return;
    }

    setErrors({});
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
    clearFieldError('scheduledTimes');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Medication" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {/* Global error banner */}
        {Object.keys(errors).length > 0 && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Please fix the errors below</p>
              <ul className="mt-1 text-xs space-y-0.5 text-red-600">
                {Object.values(errors).map((msg, i) => (
                  <li key={i}>• {msg}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Basic Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Input
              label="Medication Name *"
              value={formData.name}
              onChange={(e) => { setFormData({ ...formData, name: e.target.value }); clearFieldError('name'); }}
              placeholder="e.g., Metformin"
            />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
          </div>
          <div>
            <Input
              label="Dosage *"
              value={formData.dosage}
              onChange={(e) => { setFormData({ ...formData, dosage: e.target.value }); clearFieldError('dosage'); }}
              placeholder="e.g., 500mg"
            />
            {errors.dosage && <p className="mt-1 text-xs text-red-600">{errors.dosage}</p>}
          </div>
        </div>

        {/* Form */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Form <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <select
            value={formData.form}
            onChange={(e) => {
              // Normalize immediately — browser autocomplete can inject labels/lowercase
              const raw = e.target.value;
              const normalized = resolveForm(raw) || raw;
              setFormData({ ...formData, form: normalized });
              clearFieldError('form');
            }}
            autoComplete="off"
            className={cn(
              'w-full px-4 py-3 rounded-lg border bg-bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 focus:border-accent-primary',
              errors.form ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : 'border-border',
            )}
          >
            {FORMS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
          {errors.form && <p className="mt-1 text-xs text-red-600">{errors.form}</p>}
        </div>

        {/* Frequency */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Frequency <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <select
            value={formData.frequency}
            onChange={(e) => {
              // Normalize immediately — browser autocomplete can inject labels/lowercase
              const raw = e.target.value;
              const normalized = resolveFrequency(raw) || raw;
              setFormData({ ...formData, frequency: normalized });
              clearFieldError('frequency');
            }}
            autoComplete="off"
            className={cn(
              'w-full px-4 py-3 rounded-lg border bg-bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 focus:border-accent-primary',
              errors.frequency ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : 'border-border',
            )}
          >
            {FREQUENCIES.map((freq) => (
              <option key={freq.value} value={freq.value}>{freq.label}</option>
            ))}
          </select>
          {errors.frequency && <p className="mt-1 text-xs text-red-600">{errors.frequency}</p>}
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
                  className={cn(
                    'flex-1 px-4 py-2 rounded-lg border bg-bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 focus:border-accent-primary',
                    errors.scheduledTimes ? 'border-red-400' : 'border-border',
                  )}
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
            {errors.scheduledTimes && <p className="text-xs text-red-600">{errors.scheduledTimes}</p>}
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
          <div>
            <Input
              label="Current Supply (pills/doses)"
              type="number"
              value={formData.currentSupply}
              onChange={(e) => { setFormData({ ...formData, currentSupply: e.target.value }); clearFieldError('currentSupply'); }}
              placeholder="e.g., 90"
            />
            {errors.currentSupply && <p className="mt-1 text-xs text-red-600">{errors.currentSupply}</p>}
          </div>
          <div>
            <Input
              label="Refill Alert At"
              type="number"
              value={formData.refillAt}
              onChange={(e) => { setFormData({ ...formData, refillAt: e.target.value }); clearFieldError('refillAt'); }}
              placeholder="e.g., 15"
            />
            {errors.refillAt && <p className="mt-1 text-xs text-red-600">{errors.refillAt}</p>}
          </div>
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Input
              label="Start Date *"
              type="date"
              value={formData.startDate}
              onChange={(e) => { setFormData({ ...formData, startDate: e.target.value }); clearFieldError('startDate'); }}
            />
            {errors.startDate && <p className="mt-1 text-xs text-red-600">{errors.startDate}</p>}
          </div>
          <div>
            <Input
              label="End Date (optional)"
              type="date"
              value={formData.endDate}
              onChange={(e) => { setFormData({ ...formData, endDate: e.target.value }); clearFieldError('endDate'); }}
            />
            {errors.endDate && <p className="mt-1 text-xs text-red-600">{errors.endDate}</p>}
          </div>
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

