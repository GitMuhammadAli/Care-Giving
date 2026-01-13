'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pill, Calendar, AlertTriangle, Clock, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface CareRecipientCardProps {
  recipient: {
    id: string;
    firstName: string;
    lastName: string;
    preferredName?: string;
    photoUrl?: string;
    bloodType?: string;
    dateOfBirth: string;
  };
  currentCaregiver?: {
    name: string;
    until?: string;
  };
  upcomingItems?: {
    medications?: number;
    appointments?: Array<{
      title: string;
      time: string;
    }>;
  };
  onEmergency?: () => void;
  className?: string;
}

export function CareRecipientCard({
  recipient,
  currentCaregiver,
  upcomingItems,
  onEmergency,
  className,
}: CareRecipientCardProps) {
  const displayName = recipient.preferredName || `${recipient.firstName} ${recipient.lastName}`;
  const age = Math.floor(
    (new Date().getTime() - new Date(recipient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card variant="interactive" padding="default" className={cn('group', className)}>
        <Link href={`/care/${recipient.id}`} className="block">
          {/* Header */}
          <div className="flex items-start gap-4">
            <Avatar
              name={displayName}
              src={recipient.photoUrl}
              size="xl"
              className="ring-4 ring-accent-primary-light"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-xl font-semibold text-text-primary group-hover:text-accent-primary transition-colors">
                    {displayName}
                  </h3>
                  <p className="text-sm text-text-secondary mt-0.5">
                    Age {age}
                    {recipient.bloodType && ` • Blood Type: ${recipient.bloodType}`}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-text-tertiary group-hover:text-accent-primary transition-colors" />
              </div>

              {/* Current Caregiver */}
              {currentCaregiver && (
                <div className="mt-3">
                  <Badge variant="success" size="default">
                    <Clock className="w-3.5 h-3.5 mr-1" />
                    On Duty: {currentCaregiver.name}
                    {currentCaregiver.until && ` (until ${currentCaregiver.until})`}
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* Upcoming Items */}
          {upcomingItems && (
            <div className="mt-4 p-3 bg-bg-muted rounded-lg space-y-2">
              <p className="text-xs font-medium text-text-tertiary uppercase tracking-wide">Next Up</p>
              
              {upcomingItems.medications !== undefined && upcomingItems.medications > 0 && (
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <Pill className="w-4 h-4 text-accent-primary" />
                  <span>{upcomingItems.medications} medication{upcomingItems.medications !== 1 ? 's' : ''} due today</span>
                </div>
              )}

              {upcomingItems.appointments?.map((apt, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-text-secondary">
                  <Calendar className="w-4 h-4 text-info" />
                  <span>{apt.title}</span>
                  <span className="text-text-tertiary">{apt.time}</span>
                </div>
              ))}
            </div>
          )}
        </Link>

        {/* Actions */}
        <div className="flex gap-3 mt-4 pt-4 border-t border-border-subtle">
          <Button
            variant="secondary"
            size="default"
            className="flex-1"
            onClick={(e) => {
              e.preventDefault();
              // Navigate to details
            }}
          >
            View Details
          </Button>
          <Button
            variant="emergency"
            size="default"
            leftIcon={<AlertTriangle className="w-4 h-4" />}
            onClick={(e) => {
              e.preventDefault();
              onEmergency?.();
            }}
            className="animate-none"
          >
            Emergency
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}

