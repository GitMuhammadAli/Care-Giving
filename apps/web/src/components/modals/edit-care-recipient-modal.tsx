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
  firstName: string;
  lastName: string;
  preferredName?: string;
  dateOfBirth: string;
  bloodType?: string;
  allergies: string[];
  medicalConditions: string[];
  notes?: string;
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  insuranceGroupNumber?: string;
  preferredHospital?: string;
  preferredHospitalAddress?: string;
  preferredHospitalPhone?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  careRecipient: CareRecipient;
}

export function EditCareRecipientModal({ isOpen, onClose, careRecipient }: Props) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    firstName: careRecipient.firstName,
    lastName: careRecipient.lastName,
    preferredName: careRecipient.preferredName || '',
    dateOfBirth: careRecipient.dateOfBirth.split('T')[0],
    bloodType: careRecipient.bloodType || '',
    allergies: careRecipient.allergies,
    medicalConditions: careRecipient.medicalConditions,
    notes: careRecipient.notes || '',
    insuranceProvider: careRecipient.insuranceProvider || '',
    insurancePolicyNumber: careRecipient.insurancePolicyNumber || '',
    insuranceGroupNumber: careRecipient.insuranceGroupNumber || '',
    preferredHospital: careRecipient.preferredHospital || '',
    preferredHospitalAddress: careRecipient.preferredHospitalAddress || '',
    preferredHospitalPhone: careRecipient.preferredHospitalPhone || '',
  });

  const [newAllergy, setNewAllergy] = useState('');
  const [newCondition, setNewCondition] = useState('');

  const mutation = useMutation({
    mutationFn: (data: typeof formData) => 
      api.patch(`/care-recipients/${careRecipient.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['care-recipient', careRecipient.id] });
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
        medicalConditions: [...formData.medicalConditions, newCondition.trim()],
      });
      setNewCondition('');
    }
  };

  const removeCondition = (index: number) => {
    setFormData({
      ...formData,
      medicalConditions: formData.medicalConditions.filter((_, i) => i !== index),
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Care Recipient" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="First Name"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            required
          />
          <Input
            label="Last Name"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            required
          />
          <Input
            label="Preferred Name (Nickname)"
            value={formData.preferredName}
            onChange={(e) => setFormData({ ...formData, preferredName: e.target.value })}
            placeholder="e.g., Grandma Maggie"
          />
          <Input
            label="Date of Birth"
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
            {formData.medicalConditions.map((condition, index) => (
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Provider"
              value={formData.insuranceProvider}
              onChange={(e) => setFormData({ ...formData, insuranceProvider: e.target.value })}
              placeholder="e.g., BlueCross"
            />
            <Input
              label="Policy Number"
              value={formData.insurancePolicyNumber}
              onChange={(e) => setFormData({ ...formData, insurancePolicyNumber: e.target.value })}
            />
            <Input
              label="Group Number"
              value={formData.insuranceGroupNumber}
              onChange={(e) => setFormData({ ...formData, insuranceGroupNumber: e.target.value })}
            />
          </div>
        </div>

        {/* Preferred Hospital */}
        <div>
          <h3 className="text-sm font-medium text-text-primary mb-3">Preferred Hospital</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Hospital Name"
              value={formData.preferredHospital}
              onChange={(e) => setFormData({ ...formData, preferredHospital: e.target.value })}
            />
            <Input
              label="Address"
              value={formData.preferredHospitalAddress}
              onChange={(e) => setFormData({ ...formData, preferredHospitalAddress: e.target.value })}
            />
            <Input
              label="Phone"
              value={formData.preferredHospitalPhone}
              onChange={(e) => setFormData({ ...formData, preferredHospitalPhone: e.target.value })}
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

