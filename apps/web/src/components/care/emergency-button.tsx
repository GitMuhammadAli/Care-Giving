'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Modal, ModalFooter } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { 
  AlertTriangle, 
  PersonStanding, 
  Stethoscope, 
  Building2, 
  Search,
  MapPin,
  Loader2,
  CheckCircle2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface EmergencyButtonProps {
  careRecipientId?: string;
  className?: string;
}

const emergencyTypes = [
  { type: 'FALL', icon: PersonStanding, label: 'Fall', color: 'bg-warning' },
  { type: 'MEDICAL', icon: Stethoscope, label: 'Medical Emergency', color: 'bg-emergency' },
  { type: 'HOSPITALIZATION', icon: Building2, label: 'Going to Hospital', color: 'bg-info' },
  { type: 'MISSING', icon: Search, label: 'Missing', color: 'bg-error' },
];

export function EmergencyButton({ careRecipientId, className }: EmergencyButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!selectedType || !careRecipientId) return;

    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    setIsSubmitting(false);
    setIsSuccess(true);
    
    // Reset after showing success
    setTimeout(() => {
      setIsOpen(false);
      setSelectedType(null);
      setLocation('');
      setDescription('');
      setIsSuccess(false);
    }, 2000);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setIsOpen(false);
      setSelectedType(null);
      setLocation('');
      setDescription('');
    }
  };

  if (!careRecipientId) return null;

  return (
    <>
      {/* Floating Emergency Button - Mobile Only */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className={cn(
          'fixed right-4 bottom-20 sm:hidden z-50',
          'flex items-center gap-2 px-5 h-14 rounded-full',
          'bg-emergency text-text-inverse font-semibold',
          'shadow-lg hover:shadow-xl',
          'animate-pulse-emergency',
          className
        )}
        aria-label="Emergency Alert"
      >
        <AlertTriangle className="w-5 h-5" />
        <span>Emergency</span>
      </motion.button>

      {/* Emergency Modal */}
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title={isSuccess ? undefined : "What's happening?"}
        description={isSuccess ? undefined : 'Select the type of emergency to alert your family.'}
        size="md"
        closeOnOverlay={!isSubmitting}
        showClose={!isSubmitting && !isSuccess}
      >
        <AnimatePresence mode="wait">
          {isSuccess ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="py-12 text-center"
            >
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-success-light flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-success" />
              </div>
              <h3 className="text-2xl font-semibold text-text-primary mb-2">Help is on the way</h3>
              <p className="text-text-secondary">All family members have been notified</p>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Emergency Type Selection */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                {emergencyTypes.map((emergency) => {
                  const Icon = emergency.icon;
                  const isSelected = selectedType === emergency.type;
                  
                  return (
                    <motion.button
                      key={emergency.type}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setSelectedType(emergency.type)}
                      className={cn(
                        'flex flex-col items-center justify-center gap-2 p-4 rounded-xl',
                        'border-2 transition-all duration-150',
                        isSelected
                          ? 'border-emergency bg-emergency-light'
                          : 'border-border-default bg-bg-surface hover:border-border-strong'
                      )}
                    >
                      <div className={cn('w-12 h-12 rounded-full flex items-center justify-center', emergency.color)}>
                        <Icon className="w-6 h-6 text-text-inverse" />
                      </div>
                      <span className={cn(
                        'text-sm font-medium',
                        isSelected ? 'text-emergency' : 'text-text-primary'
                      )}>
                        {emergency.label}
                      </span>
                    </motion.button>
                  );
                })}
              </div>

              {/* Location Input */}
              <div className="mb-4">
                <Input
                  label="Location (optional)"
                  placeholder="e.g., Living room, backyard"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  leftIcon={<MapPin className="w-5 h-5" />}
                  disabled={isSubmitting}
                />
              </div>

              {/* Description Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Additional details (optional)
                </label>
                <textarea
                  placeholder="What happened? Any other important information..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isSubmitting}
                  rows={3}
                  className={cn(
                    'w-full rounded-lg border border-border-default bg-bg-surface',
                    'px-3.5 py-3 text-base text-text-primary placeholder:text-text-tertiary',
                    'focus:outline-none focus:ring-2 focus:ring-border-focus focus:border-border-focus',
                    'disabled:bg-bg-muted disabled:cursor-not-allowed',
                    'resize-none'
                  )}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  size="lg"
                  fullWidth
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  variant="emergency"
                  size="lg"
                  fullWidth
                  onClick={handleSubmit}
                  disabled={!selectedType || isSubmitting}
                  isLoading={isSubmitting}
                  className="animate-none"
                >
                  Send Alert
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Modal>
    </>
  );
}

