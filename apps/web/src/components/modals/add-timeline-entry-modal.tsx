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
      const message = error?.message || 'Failed to add entry';
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
    
    const vitals = formData.type === 'VITALS' ? {
      bloodPressure: formData.bloodPressureSystolic && formData.bloodPressureDiastolic 
        ? `${formData.bloodPressureSystolic}/${formData.bloodPressureDiastolic}`
        : null,
      heartRate: formData.heartRate ? parseInt(formData.heartRate) : null,
      temperature: formData.temperature ? parseFloat(formData.temperature) : null,
      bloodSugar: formData.bloodSugar ? parseInt(formData.bloodSugar) : null,
      oxygenLevel: formData.oxygenLevel ? parseInt(formData.oxygenLevel) : null,
      weight: formData.weight ? parseFloat(formData.weight) : null,
    } : null;

    mutation.mutate({
      type: formData.type,
      title: formData.title || ENTRY_TYPES.find((t) => t.value === formData.type)?.label.replace(/^\S+\s/, ''),
      description: formData.description,
      vitals,
      metadata: {
        mood: formData.mood || null,
        activityType: formData.activityType || null,
        activityDuration: formData.activityDuration ? parseInt(formData.activityDuration) : null,
        sleepQuality: formData.sleepQuality || null,
        sleepDuration: formData.sleepDuration ? parseFloat(formData.sleepDuration) : null,
        mealType: formData.mealType || null,
        mealDescription: formData.mealDescription || null,
      },
    });
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

