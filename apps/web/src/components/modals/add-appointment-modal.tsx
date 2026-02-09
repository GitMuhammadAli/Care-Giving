'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api/client';
import toast from 'react-hot-toast';
import {
  APPOINTMENT_TYPE_OPTIONS as APPOINTMENT_TYPES,
  RECURRENCE_OPTIONS,
  DEFAULT_APPOINTMENT_TYPE,
  DEFAULT_RECURRENCE,
} from '@/lib/constants';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  careRecipientId: string;
  selectedDate?: Date;
}

export function AddAppointmentModal({ isOpen, onClose, careRecipientId, selectedDate }: Props) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: '',
    type: DEFAULT_APPOINTMENT_TYPE,
    doctorName: '',
    location: '',
    address: '',
    date: selectedDate ? selectedDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    time: '09:00',
    duration: '60',
    notes: '',
    recurrence: DEFAULT_RECURRENCE,
    recurrenceEndDate: '',
    reminderBefore: ['1day', '1hour'],
    transportAssignedTo: '',
  });

  const mutation = useMutation({
    mutationFn: (data: any) => 
      api.post(`/care-recipients/${careRecipientId}/appointments`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', careRecipientId] });
      toast.success('Appointment scheduled successfully');
      onClose();
      resetForm();
    },
    onError: (error: any) => {
      const fieldErrors = error?.data?.errors;
      if (fieldErrors && typeof fieldErrors === 'object') {
        const firstError = Object.values(fieldErrors).flat()[0];
        toast.error(typeof firstError === 'string' ? firstError : 'Validation failed. Please check all fields.');
        return;
      }
      const message = error?.data?.message || error?.message || 'Failed to schedule appointment';
      toast.error(typeof message === 'string' ? message : 'Failed to schedule appointment. Please check all fields.');
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      type: DEFAULT_APPOINTMENT_TYPE,
      doctorName: '',
      location: '',
      address: '',
      date: new Date().toISOString().split('T')[0],
      time: '09:00',
      duration: '60',
      notes: '',
      recurrence: DEFAULT_RECURRENCE,
      recurrenceEndDate: '',
      reminderBefore: ['1day', '1hour'],
      transportAssignedTo: '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const dateTime = new Date(`${formData.date}T${formData.time}`);
    
    // Build clean payload – only include fields that exist in the backend DTO.
    // Sending extra fields trips forbidNonWhitelisted, sending null for
    // optional strings gets converted to "null" by class-transformer.
    const payload: Record<string, unknown> = {
      title: formData.title,
      type: formData.type,
      dateTime: dateTime.toISOString(),
      duration: parseInt(formData.duration),
    };

    if (formData.doctorName.trim()) {
      payload.doctorName = formData.doctorName.trim();
    }
    if (formData.location.trim()) {
      payload.location = formData.location.trim();
    }
    if (formData.address.trim()) {
      payload.address = formData.address.trim();
    }
    if (formData.notes.trim()) {
      payload.notes = formData.notes.trim();
    }
    if (formData.recurrence !== DEFAULT_RECURRENCE) {
      payload.recurrence = formData.recurrence;
      if (formData.recurrenceEndDate) {
        payload.recurrenceEndDate = formData.recurrenceEndDate;
      }
    }
    if (formData.reminderBefore.length > 0) {
      payload.reminderBefore = formData.reminderBefore;
    }

    mutation.mutate(payload);
  };

  const toggleReminder = (value: string) => {
    const reminders = formData.reminderBefore.includes(value)
      ? formData.reminderBefore.filter((r) => r !== value)
      : [...formData.reminderBefore, value];
    setFormData({ ...formData, reminderBefore: reminders });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Schedule Appointment" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title & Type */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Appointment Title *"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g., Annual Checkup"
            required
          />
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Type
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-4 py-3 rounded-lg border border-border bg-bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 focus:border-accent-primary"
            >
              {APPOINTMENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Doctor & Location */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Doctor / Provider Name"
            value={formData.doctorName}
            onChange={(e) => setFormData({ ...formData, doctorName: e.target.value })}
            placeholder="e.g., Dr. Smith"
          />
          <Input
            label="Location Name"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder="e.g., Main Street Medical Center"
          />
        </div>

        <Input
          label="Address"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          placeholder="Full address"
        />

        {/* Date & Time */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Date *"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
          />
          <Input
            label="Time *"
            type="time"
            value={formData.time}
            onChange={(e) => setFormData({ ...formData, time: e.target.value })}
            required
          />
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Duration
            </label>
            <select
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
              className="w-full px-4 py-3 rounded-lg border border-border bg-bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 focus:border-accent-primary"
            >
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="45">45 minutes</option>
              <option value="60">1 hour</option>
              <option value="90">1.5 hours</option>
              <option value="120">2 hours</option>
            </select>
          </div>
        </div>

        {/* Recurrence */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Recurrence
            </label>
            <select
              value={formData.recurrence}
              onChange={(e) => setFormData({ ...formData, recurrence: e.target.value })}
              className="w-full px-4 py-3 rounded-lg border border-border bg-bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 focus:border-accent-primary"
            >
              {RECURRENCE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          {formData.recurrence !== DEFAULT_RECURRENCE && (
            <Input
              label="Repeat Until"
              type="date"
              value={formData.recurrenceEndDate}
              onChange={(e) => setFormData({ ...formData, recurrenceEndDate: e.target.value })}
            />
          )}
        </div>

        {/* Reminders */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Remind Me
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              { value: '1week', label: '1 week before' },
              { value: '1day', label: '1 day before' },
              { value: '1hour', label: '1 hour before' },
              { value: '30min', label: '30 min before' },
            ].map((reminder) => (
              <button
                key={reminder.value}
                type="button"
                onClick={() => toggleReminder(reminder.value)}
                className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                  formData.reminderBefore.includes(reminder.value)
                    ? 'bg-accent-primary text-white'
                    : 'bg-bg-muted text-text-secondary hover:bg-bg-subtle'
                }`}
              >
                {reminder.label}
              </button>
            ))}
          </div>
        </div>

        {/* Transport */}
        <Input
          label="Transport Assigned To (optional)"
          value={formData.transportAssignedTo}
          onChange={(e) => setFormData({ ...formData, transportAssignedTo: e.target.value })}
          placeholder="Family member responsible for transport"
        />

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Notes
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-4 py-3 rounded-lg border border-border bg-bg-surface text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 focus:border-accent-primary resize-none"
            rows={2}
            placeholder="Any notes for this appointment..."
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={mutation.isPending}>
            Schedule Appointment
          </Button>
        </div>
      </form>
    </Modal>
  );
}

