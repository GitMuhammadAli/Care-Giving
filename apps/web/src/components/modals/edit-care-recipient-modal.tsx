'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Plus, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api/client';
import toast from 'react-hot-toast';

interface CareRecipient {
  id: string;
  fullName: string;
  preferredName?: string;
  dateOfBirth?: string;
  bloodType?: string;
  allergies?: string[];
  conditions?: string[];
  notes?: string;
  insuranceProvider?: string;
  insurancePolicyNo?: string;
  primaryHospital?: string;
  hospitalAddress?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  careRecipient: CareRecipient;
}

export function EditCareRecipientModal({ isOpen, onClose, careRecipient }: Props) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    fullName: careRecipient.fullName || '',
    preferredName: careRecipient.preferredName || '',
    dateOfBirth: careRecipient.dateOfBirth?.split('T')[0] || '',
    bloodType: careRecipient.bloodType || '',
    allergies: careRecipient.allergies || [],
    conditions: careRecipient.conditions || [],
    notes: careRecipient.notes || '',
    insuranceProvider: careRecipient.insuranceProvider || '',
    insurancePolicyNo: careRecipient.insurancePolicyNo || '',
    primaryHospital: careRecipient.primaryHospital || '',
    hospitalAddress: careRecipient.hospitalAddress || '',
  });

  const [newAllergy, setNewAllergy] = useState('');
  const [newCondition, setNewCondition] = useState('');

  const mutation = useMutation({
    mutationFn: (data: typeof formData) =>
      api.patch(`/care-recipients/${careRecipient.id}`, data),
    onSuccess: () => {
      // Invalidate all related queries for consistent updates
      queryClient.invalidateQueries({ queryKey: ['care-recipient', careRecipient.id] });
      queryClient.invalidateQueries({ queryKey: ['careRecipient', careRecipient.id] });
      queryClient.invalidateQueries({ queryKey: ['care-recipients'] });
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['families'] });
      toast.success('Care recipient updated successfully');
      onClose();
    },
    onError: () => {
      toast.error('Failed to update care recipient');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
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
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Care Recipient" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Full Name *"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            required
            className="sm:col-span-2"
          />
          <Input
            label="Preferred Name (Nickname)"
            value={formData.preferredName}
            onChange={(e) => setFormData({ ...formData, preferredName: e.target.value })}
            placeholder="e.g., Grandma Maggie"
          />
          <Input
            label="Date of Birth *"
            type="date"
            value={formData.dateOfBirth}
            onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
            required
          />
          <Input
            label="Blood Type"
            value={formData.bloodType}
            onChange={(e) => setFormData({ ...formData, bloodType: e.target.value })}
            placeholder="e.g., A+"
            className="sm:col-span-2"
          />
        </div>

        {/* Allergies */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Allergies
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {formData.allergies.map((allergy, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-3 py-1 bg-error-light text-error rounded-full text-sm"
              >
                {allergy}
                <button
                  type="button"
                  onClick={() => removeAllergy(index)}
                  className="hover:bg-error/20 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newAllergy}
              onChange={(e) => setNewAllergy(e.target.value)}
              placeholder="Add allergy"
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addAllergy())}
            />
            <Button type="button" variant="secondary" onClick={addAllergy}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Medical Conditions */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Medical Conditions
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {formData.conditions.map((condition, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-3 py-1 bg-warning-light text-warning rounded-full text-sm"
              >
                {condition}
                <button
                  type="button"
                  onClick={() => removeCondition(index)}
                  className="hover:bg-warning/20 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newCondition}
              onChange={(e) => setNewCondition(e.target.value)}
              placeholder="Add condition"
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCondition())}
            />
            <Button type="button" variant="secondary" onClick={addCondition}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Notes
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-4 py-3 rounded-lg border border-border bg-bg-surface text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 focus:border-accent-primary resize-none"
            rows={3}
            placeholder="Any additional notes about care..."
          />
        </div>

        {/* Insurance */}
        <div>
          <h3 className="text-sm font-medium text-text-primary mb-3">Insurance Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Provider"
              value={formData.insuranceProvider}
              onChange={(e) => setFormData({ ...formData, insuranceProvider: e.target.value })}
              placeholder="e.g., BlueCross"
            />
            <Input
              label="Policy Number"
              value={formData.insurancePolicyNo}
              onChange={(e) => setFormData({ ...formData, insurancePolicyNo: e.target.value })}
            />
          </div>
        </div>

        {/* Primary Hospital */}
        <div>
          <h3 className="text-sm font-medium text-text-primary mb-3">Primary Hospital</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Hospital Name"
              value={formData.primaryHospital}
              onChange={(e) => setFormData({ ...formData, primaryHospital: e.target.value })}
            />
            <Input
              label="Address"
              value={formData.hospitalAddress}
              onChange={(e) => setFormData({ ...formData, hospitalAddress: e.target.value })}
            />
          </div>
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

