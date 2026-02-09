'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api/client';
import { queueAction, isOnline } from '@/lib/offline-storage';
import toast from 'react-hot-toast';
import {
  TIMELINE_TYPE_OPTIONS as ENTRY_TYPES,
  MOOD_OPTIONS as MOODS,
  DEFAULT_TIMELINE_TYPE,
} from '@/lib/constants';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  careRecipientId: string;
}

export function AddTimelineEntryModal({ isOpen, onClose, careRecipientId }: Props) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    type: DEFAULT_TIMELINE_TYPE,
    title: '',
    description: '',
    // Vitals
    bloodPressureSystolic: '',
    bloodPressureDiastolic: '',
    heartRate: '',
    temperature: '',
    bloodSugar: '',
    oxygenLevel: '',
    weight: '',
    // Mood
    mood: '',
    // Activity
    activityType: '',
    activityDuration: '',
    // Sleep
    sleepQuality: '',
    sleepDuration: '',
    // Meal
    mealType: '',
    mealDescription: '',
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (!isOnline()) {
        await queueAction({
          type: 'timeline_entry',
          payload: { careRecipientId, data },
        });
        return { queued: true };
      }
      return api.post(`/care-recipients/${careRecipientId}/timeline`, data);
    },
    onSuccess: (result: any) => {
      if (result?.queued) {
        toast.success('Entry saved offline. Will sync when online.');
      } else {
        toast.success('Timeline entry added');
      }
      queryClient.invalidateQueries({ queryKey: ['timeline', careRecipientId] });
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
      const message = error?.data?.message || error?.message || 'Failed to add entry';
      toast.error(typeof message === 'string' ? message : 'Failed to add entry. Please check all fields.');
    },
  });

  const resetForm = () => {
    setFormData({
      type: DEFAULT_TIMELINE_TYPE,
      title: '',
      description: '',
      bloodPressureSystolic: '',
      bloodPressureDiastolic: '',
      heartRate: '',
      temperature: '',
      bloodSugar: '',
      oxygenLevel: '',
      weight: '',
      mood: '',
      activityType: '',
      activityDuration: '',
      sleepQuality: '',
      sleepDuration: '',
      mealType: '',
      mealDescription: '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Build clean payload matching the backend DTO exactly.
    // The DTO only accepts: type, title, description, severity, vitals, occurredAt, attachments
    // Extra metadata (mood, meal, sleep, activity) goes into the vitals JSON field.
    const payload: Record<string, unknown> = {
      type: formData.type,
      title: formData.title || ENTRY_TYPES.find((t) => t.value === formData.type)?.label.replace(/^\S+\s/, ''),
    };

    if (formData.description.trim()) {
      payload.description = formData.description.trim();
    }

    // Build vitals / extra data as a single JSON object
    const vitalsData: Record<string, unknown> = {};

    if (formData.type === 'VITALS') {
      if (formData.bloodPressureSystolic && formData.bloodPressureDiastolic) {
        vitalsData.bloodPressure = `${formData.bloodPressureSystolic}/${formData.bloodPressureDiastolic}`;
      }
      if (formData.heartRate) vitalsData.heartRate = parseInt(formData.heartRate);
      if (formData.temperature) vitalsData.temperature = parseFloat(formData.temperature);
      if (formData.bloodSugar) vitalsData.bloodSugar = parseInt(formData.bloodSugar);
      if (formData.oxygenLevel) vitalsData.oxygenLevel = parseInt(formData.oxygenLevel);
      if (formData.weight) vitalsData.weight = parseFloat(formData.weight);
    }

    if (formData.type === 'MOOD' && formData.mood) {
      vitalsData.mood = formData.mood;
    }
    if (formData.type === 'ACTIVITY') {
      if (formData.activityType) vitalsData.activityType = formData.activityType;
      if (formData.activityDuration) vitalsData.activityDuration = parseInt(formData.activityDuration);
    }
    if (formData.type === 'SLEEP') {
      if (formData.sleepQuality) vitalsData.sleepQuality = formData.sleepQuality;
      if (formData.sleepDuration) vitalsData.sleepDuration = parseFloat(formData.sleepDuration);
    }
    if (formData.type === 'MEAL') {
      if (formData.mealType) vitalsData.mealType = formData.mealType;
      if (formData.mealDescription) vitalsData.mealDescription = formData.mealDescription;
    }

    if (Object.keys(vitalsData).length > 0) {
      payload.vitals = vitalsData;
    }

    mutation.mutate(payload);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Timeline Entry" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Entry Type */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Entry Type
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {ENTRY_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setFormData({ ...formData, type: type.value })}
                className={`p-3 rounded-lg text-sm text-center transition-all ${
                  formData.type === type.value
                    ? 'bg-accent-primary text-white ring-2 ring-accent-primary ring-offset-2'
                    : 'bg-bg-muted text-text-secondary hover:bg-bg-subtle'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <Input
          label="Title (optional)"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Brief title for this entry"
        />

        {/* Vitals Fields */}
        {formData.type === 'VITALS' && (
          <div className="space-y-4 p-4 bg-bg-muted rounded-lg">
            <h3 className="font-medium text-text-primary">Vital Signs</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-text-secondary mb-1">
                  Blood Pressure
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    placeholder="120"
                    value={formData.bloodPressureSystolic}
                    onChange={(e) => setFormData({ ...formData, bloodPressureSystolic: e.target.value })}
                    className="w-16 px-2 py-2 rounded border border-border bg-bg-surface text-center"
                  />
                  <span>/</span>
                  <input
                    type="number"
                    placeholder="80"
                    value={formData.bloodPressureDiastolic}
                    onChange={(e) => setFormData({ ...formData, bloodPressureDiastolic: e.target.value })}
                    className="w-16 px-2 py-2 rounded border border-border bg-bg-surface text-center"
                  />
                </div>
              </div>
              <Input
                label="Heart Rate (bpm)"
                type="number"
                value={formData.heartRate}
                onChange={(e) => setFormData({ ...formData, heartRate: e.target.value })}
                placeholder="72"
              />
              <Input
                label="Temperature (°F)"
                type="number"
                step="0.1"
                value={formData.temperature}
                onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
                placeholder="98.6"
              />
              <Input
                label="Blood Sugar (mg/dL)"
                type="number"
                value={formData.bloodSugar}
                onChange={(e) => setFormData({ ...formData, bloodSugar: e.target.value })}
                placeholder="100"
              />
              <Input
                label="Oxygen Level (%)"
                type="number"
                value={formData.oxygenLevel}
                onChange={(e) => setFormData({ ...formData, oxygenLevel: e.target.value })}
                placeholder="98"
              />
              <Input
                label="Weight (lbs)"
                type="number"
                step="0.1"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                placeholder="150"
              />
            </div>
          </div>
        )}

        {/* Mood Fields */}
        {formData.type === 'MOOD' && (
          <div className="space-y-4 p-4 bg-bg-muted rounded-lg">
            <h3 className="font-medium text-text-primary">Mood</h3>
            <div className="flex flex-wrap gap-2">
              {MOODS.map((mood) => (
                <button
                  key={mood}
                  type="button"
                  onClick={() => setFormData({ ...formData, mood })}
                  className={`px-4 py-2 rounded-full text-sm transition-colors ${
                    formData.mood === mood
                      ? 'bg-accent-primary text-white'
                      : 'bg-bg-surface text-text-secondary hover:bg-bg-subtle'
                  }`}
                >
                  {mood}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Activity Fields */}
        {formData.type === 'ACTIVITY' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-bg-muted rounded-lg">
            <Input
              label="Activity Type"
              value={formData.activityType}
              onChange={(e) => setFormData({ ...formData, activityType: e.target.value })}
              placeholder="e.g., Walking, Exercises"
            />
            <Input
              label="Duration (minutes)"
              type="number"
              value={formData.activityDuration}
              onChange={(e) => setFormData({ ...formData, activityDuration: e.target.value })}
              placeholder="30"
            />
          </div>
        )}

        {/* Sleep Fields */}
        {formData.type === 'SLEEP' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-bg-muted rounded-lg">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Sleep Quality
              </label>
              <select
                value={formData.sleepQuality}
                onChange={(e) => setFormData({ ...formData, sleepQuality: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border border-border bg-bg-surface text-text-primary"
              >
                <option value="">Select quality</option>
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
              </select>
            </div>
            <Input
              label="Duration (hours)"
              type="number"
              step="0.5"
              value={formData.sleepDuration}
              onChange={(e) => setFormData({ ...formData, sleepDuration: e.target.value })}
              placeholder="8"
            />
          </div>
        )}

        {/* Meal Fields */}
        {formData.type === 'MEAL' && (
          <div className="space-y-4 p-4 bg-bg-muted rounded-lg">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Meal Type
              </label>
              <select
                value={formData.mealType}
                onChange={(e) => setFormData({ ...formData, mealType: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border border-border bg-bg-surface text-text-primary"
              >
                <option value="">Select meal</option>
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
                <option value="snack">Snack</option>
              </select>
            </div>
            <Input
              label="What did they eat?"
              value={formData.mealDescription}
              onChange={(e) => setFormData({ ...formData, mealDescription: e.target.value })}
              placeholder="Describe the meal..."
            />
          </div>
        )}

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Notes
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-3 rounded-lg border border-border bg-bg-surface text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 focus:border-accent-primary resize-none"
            rows={3}
            placeholder="Add any additional notes..."
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={mutation.isPending}>
            Add Entry
          </Button>
        </div>
      </form>
    </Modal>
  );
}

