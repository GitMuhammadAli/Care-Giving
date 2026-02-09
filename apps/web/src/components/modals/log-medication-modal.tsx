'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, XCircle } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api/client';
import { queueAction, isOnline } from '@/lib/offline-storage';
import toast from 'react-hot-toast';
import { MEDICATION_SKIP_REASONS as SKIP_REASONS } from '@/lib/constants';

interface Medication {
  id: string;
  name: string;
  dosage: string;
  scheduledTime: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  medication: Medication;
  careRecipientId: string;
}

export function LogMedicationModal({ isOpen, onClose, medication, careRecipientId }: Props) {
  const queryClient = useQueryClient();
  const [action, setAction] = useState<'GIVEN' | 'SKIPPED' | null>(null);
  const [skipReason, setSkipReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [notes, setNotes] = useState('');

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (!isOnline()) {
        await queueAction({
          type: 'medication_log',
          payload: { medicationId: medication.id, data },
        });
        return { queued: true };
      }
      return api.post(`/medications/${medication.id}/log`, data);
    },
    onSuccess: (result: any) => {
      if (result?.queued) {
        toast.success('Logged offline. Will sync when online.');
      } else {
        toast.success(action === 'GIVEN' ? 'Medication logged as given' : 'Medication logged as skipped');
      }
      queryClient.invalidateQueries({ queryKey: ['medications', careRecipientId] });
      queryClient.invalidateQueries({ queryKey: ['timeline', careRecipientId] });
      onClose();
      resetForm();
    },
    onError: (error: any) => {
      const message = error?.message || 'Failed to log medication';
      toast.error(typeof message === 'string' ? message : 'Failed to log medication.');
    },
  });

  const resetForm = () => {
    setAction(null);
    setSkipReason('');
    setCustomReason('');
    setNotes('');
  };

  const handleSubmit = () => {
    if (!action) return;

    const data: any = {
      status: action,
      scheduledTime: medication.scheduledTime,
      notes: notes || null,
    };

    if (action === 'SKIPPED') {
      data.skipReason = skipReason === 'Other' ? customReason : skipReason;
    }

    mutation.mutate(data);
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={`Log ${medication.name}`}
      size="sm"
    >
      <div className="space-y-6">
        {/* Medication Info */}
        <div className="text-center p-4 bg-bg-muted rounded-lg">
          <p className="text-lg font-semibold text-text-primary">{medication.name}</p>
          <p className="text-text-secondary">{medication.dosage}</p>
          <p className="text-sm text-text-tertiary mt-1">
            Scheduled for {medication.scheduledTime}
          </p>
        </div>

        {/* Action Selection */}
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setAction('GIVEN')}
            className={`p-6 rounded-xl flex flex-col items-center gap-2 transition-all ${
              action === 'GIVEN'
                ? 'bg-success text-white ring-2 ring-success ring-offset-2'
                : 'bg-success-light text-success hover:bg-success/20'
            }`}
          >
            <CheckCircle className="w-10 h-10" />
            <span className="font-semibold">Given</span>
          </button>
          <button
            type="button"
            onClick={() => setAction('SKIPPED')}
            className={`p-6 rounded-xl flex flex-col items-center gap-2 transition-all ${
              action === 'SKIPPED'
                ? 'bg-warning text-white ring-2 ring-warning ring-offset-2'
                : 'bg-warning-light text-warning hover:bg-warning/20'
            }`}
          >
            <XCircle className="w-10 h-10" />
            <span className="font-semibold">Skipped</span>
          </button>
        </div>

        {/* Skip Reason */}
        {action === 'SKIPPED' && (
          <div className="space-y-3 animate-fade-in">
            <label className="block text-sm font-medium text-text-primary">
              Why was this medication skipped?
            </label>
            <div className="space-y-2">
              {SKIP_REASONS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setSkipReason(reason)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                    skipReason === reason
                      ? 'bg-accent-primary text-white'
                      : 'bg-bg-muted text-text-secondary hover:bg-bg-subtle'
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>
            {skipReason === 'Other' && (
              <textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-border bg-bg-surface text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 focus:border-accent-primary resize-none"
                rows={2}
                placeholder="Please specify the reason..."
              />
            )}
          </div>
        )}

        {/* Notes */}
        {action && (
          <div className="animate-fade-in">
            <label className="block text-sm font-medium text-text-primary mb-2">
              Additional Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-border bg-bg-surface text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 focus:border-accent-primary resize-none"
              rows={2}
              placeholder="Any notes to add..."
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            type="button" 
            variant="primary" 
            onClick={handleSubmit}
            isLoading={mutation.isPending}
            disabled={!action || (action === 'SKIPPED' && !skipReason) || (skipReason === 'Other' && !customReason)}
          >
            Log Medication
          </Button>
        </div>
      </div>
    </Modal>
  );
}

