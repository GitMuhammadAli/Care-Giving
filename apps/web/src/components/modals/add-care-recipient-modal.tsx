'use client';

import { useState } from 'react';
import { X, Plus, Heart, UserPlus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCreateCareRecipient } from '@/hooks/use-care-recipients';
import { BLOOD_TYPE_OPTIONS } from '@/lib/constants';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  familyId: string;
  onSuccess?: () => void;
}

export function AddCareRecipientModal({ isOpen, onClose, familyId, onSuccess }: Props) {
  const createCareRecipient = useCreateCareRecipient(familyId);

  const [formData, setFormData] = useState({
    fullName: '',
    preferredName: '',
    dateOfBirth: '',
    bloodType: '',
    allergies: [] as string[],
    conditions: [] as string[],
    notes: '',
  });

  const [newAllergy, setNewAllergy] = useState('');
  const [newCondition, setNewCondition] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createCareRecipient.mutateAsync({
        fullName: formData.fullName,
        preferredName: formData.preferredName || undefined,
        dateOfBirth: formData.dateOfBirth || undefined,
        bloodType: formData.bloodType || undefined,
        allergies: formData.allergies.length > 0 ? formData.allergies : undefined,
        conditions: formData.conditions.length > 0 ? formData.conditions : undefined,
        notes: formData.notes || undefined,
      });

      // Reset form
      setFormData({
        fullName: '',
        preferredName: '',
        dateOfBirth: '',
        bloodType: '',
        allergies: [],
        conditions: [],
        notes: '',
      });

      onClose();
      onSuccess?.();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const addAllergy = () => {
    if (newAllergy.trim()) {
      setFormData({
        ...formData,
        allergies: [...formData.allergies, newAllergy.trim()],
      });
      setNewAllergy('');
    }
  };

  const removeAllergy = (index: number) => {
    setFormData({
      ...formData,
      allergies: formData.allergies.filter((_, i) => i !== index),
    });
  };

  const addCondition = () => {
    if (newCondition.trim()) {
      setFormData({
        ...formData,
        conditions: [...formData.conditions, newCondition.trim()],
      });
      setNewCondition('');
    }
  };

  const removeCondition = (index: number) => {
    setFormData({
      ...formData,
      conditions: formData.conditions.filter((_, i) => i !== index),
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
              <Heart className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="font-serif text-xl">Add Care Recipient</DialogTitle>
              <p className="text-sm text-muted-foreground mt-0.5">Add someone you care for</p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Full Name <span className="text-destructive">*</span>
              </label>
              <Input
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="e.g., Margaret Johnson"
                required
                className="rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Preferred Name
                </label>
                <Input
                  value={formData.preferredName}
                  onChange={(e) => setFormData({ ...formData, preferredName: e.target.value })}
                  placeholder="e.g., Grandma Maggie"
                  className="rounded-xl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Date of Birth
                </label>
                <Input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  className="rounded-xl"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Blood Type
              </label>
              <select
                value={formData.bloodType}
                onChange={(e) => setFormData({ ...formData, bloodType: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-border bg-background text-foreground"
              >
                {BLOOD_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Allergies */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Allergies
            </label>
            {formData.allergies.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.allergies.map((allergy, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-destructive/10 text-destructive rounded-full text-sm"
                  >
                    {allergy}
                    <button
                      type="button"
                      onClick={() => removeAllergy(index)}
                      className="hover:bg-destructive/20 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                value={newAllergy}
                onChange={(e) => setNewAllergy(e.target.value)}
                placeholder="Add allergy (e.g., Penicillin)"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addAllergy())}
                className="rounded-xl"
              />
              <Button type="button" variant="outline" onClick={addAllergy} className="rounded-xl px-3">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Medical Conditions */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Medical Conditions
            </label>
            {formData.conditions.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.conditions.map((condition, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-amber-500/10 text-amber-600 rounded-full text-sm"
                  >
                    {condition}
                    <button
                      type="button"
                      onClick={() => removeCondition(index)}
                      className="hover:bg-amber-500/20 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                value={newCondition}
                onChange={(e) => setNewCondition(e.target.value)}
                placeholder="Add condition (e.g., Diabetes)"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCondition())}
                className="rounded-xl"
              />
              <Button type="button" variant="outline" onClick={addCondition} className="rounded-xl px-3">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              rows={3}
              placeholder="Any additional notes about care needs..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">
              Cancel
            </Button>
            <Button type="submit" className="rounded-xl" disabled={createCareRecipient.isPending}>
              <UserPlus className="w-4 h-4 mr-2" />
              {createCareRecipient.isPending ? 'Adding...' : 'Add Care Recipient'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
