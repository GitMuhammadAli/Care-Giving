'use client';

import { useState } from 'react';
import { cn, formatTime } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal, ModalFooter } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Check, X, Clock, Pill, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export interface MedicationScheduleItem {
  medication: {
    id: string;
    name: string;
    dosage: string;
    form: string;
    instructions?: string;
  };
  scheduledTime: string;
  time: string;
  status: 'PENDING' | 'GIVEN' | 'SKIPPED' | 'MISSED';
  logId?: string;
  givenTime?: string;
  givenBy?: {
    id: string;
    fullName: string;
  };
}

interface MedicationCardProps {
  item: MedicationScheduleItem;
  onLog?: (medicationId: string, status: 'GIVEN' | 'SKIPPED', skipReason?: string) => Promise<void>;
  className?: string;
}

const formIcons: Record<string, string> = {
  TABLET: '💊',
  CAPSULE: '💊',
  LIQUID: '🧪',
  INJECTION: '💉',
  PATCH: '🩹',
  CREAM: '🧴',
  INHALER: '🌬️',
  DROPS: '💧',
  OTHER: '💊',
};

export function MedicationCard({ item, onLog, className }: MedicationCardProps) {
  const [isLogging, setIsLogging] = useState(false);
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [skipReason, setSkipReason] = useState('');

  const isPending = item.status === 'PENDING';
  const isGiven = item.status === 'GIVEN';
  const isSkipped = item.status === 'SKIPPED';
  const isMissed = item.status === 'MISSED';

  const scheduledTime = new Date(item.scheduledTime);
  const now = new Date();
  const isDue = isPending && scheduledTime <= now;
  const isUpcoming = isPending && scheduledTime > now;

  const handleGiven = async () => {
    if (!onLog) return;
    setIsLogging(true);
    try {
      await onLog(item.medication.id, 'GIVEN');
    } finally {
      setIsLogging(false);
    }
  };

  const handleSkip = async () => {
    if (!onLog) return;
    setIsLogging(true);
    try {
      await onLog(item.medication.id, 'SKIPPED', skipReason);
      setShowSkipModal(false);
      setSkipReason('');
    } finally {
      setIsLogging(false);
    }
  };

  const getVariant = () => {
    if (isGiven) return 'success';
    if (isSkipped || isMissed) return 'highlighted';
    if (isDue) return 'urgent';
    return 'default';
  };

  return (
    <>
      <Card variant={getVariant()} padding="compact" className={cn('relative', className)}>
        {/* Status Badge */}
        {isDue && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-2 -right-2"
          >
            <Badge variant="destructive" size="sm">Due Now</Badge>
          </motion.div>
        )}

        <div className="flex items-start gap-3">
          {/* Medication Icon */}
          <div
            className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center text-xl',
              isGiven ? 'bg-success-light' : isDue ? 'bg-warning-light' : 'bg-accent-primary-light'
            )}
          >
            {formIcons[item.medication.form] || '💊'}
          </div>

          {/* Medication Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="font-semibold text-text-primary truncate">
                  {item.medication.name}
                </h4>
                <p className="text-sm text-text-secondary">
                  {item.medication.dosage}
                  {item.medication.instructions && ` • ${item.medication.instructions}`}
                </p>
              </div>
              <div className="text-right">
                <p className={cn(
                  'text-sm font-medium',
                  isDue ? 'text-warning' : 'text-text-tertiary'
                )}>
                  {item.time}
                </p>
              </div>
            </div>

            {/* Status Info */}
            {isGiven && item.givenBy && (
              <p className="text-xs text-success mt-2 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                Given by {item.givenBy.fullName}
                {item.givenTime && ` at ${formatTime(item.givenTime)}`}
              </p>
            )}

            {isSkipped && (
              <p className="text-xs text-warning mt-2 flex items-center gap-1">
                <X className="w-3.5 h-3.5" />
                Skipped
              </p>
            )}

            {isMissed && (
              <p className="text-xs text-error mt-2 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                Missed
              </p>
            )}

            {/* Action Buttons */}
            {isPending && (
              <div className="flex gap-2 mt-3">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleGiven}
                  isLoading={isLogging}
                  leftIcon={<Check className="w-4 h-4" />}
                  className="flex-1"
                >
                  Given
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowSkipModal(true)}
                  disabled={isLogging}
                  leftIcon={<X className="w-4 h-4" />}
                  className="flex-1"
                >
                  Skip
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Skip Reason Modal */}
      <Modal
        isOpen={showSkipModal}
        onClose={() => setShowSkipModal(false)}
        title="Skip Medication"
        description="Please provide a reason for skipping this dose."
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="Reason (optional)"
            placeholder="e.g., Patient refused, out of stock"
            value={skipReason}
            onChange={(e) => setSkipReason(e.target.value)}
          />
          <div className="flex gap-3">
            <Button
              variant="secondary"
              size="lg"
              fullWidth
              onClick={() => setShowSkipModal(false)}
              disabled={isLogging}
            >
              Cancel
            </Button>
            <Button
              variant="warm"
              size="lg"
              fullWidth
              onClick={handleSkip}
              isLoading={isLogging}
            >
              Confirm Skip
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

