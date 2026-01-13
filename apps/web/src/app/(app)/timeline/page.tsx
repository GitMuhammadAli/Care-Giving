'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Modal, ModalFooter } from '@/components/ui/modal';
import { TimelineEntry, TimelineEntryData } from '@/components/care/timeline-entry';
import {
  Plus,
  Filter,
  Calendar,
  Pill,
  Heart,
  AlertTriangle,
  FileText,
  Smile,
  Activity,
  Search,
} from 'lucide-react';

const mockTimeline: TimelineEntryData[] = [
  {
    id: 't-1',
    type: 'VITALS',
    title: 'Vitals Recorded',
    vitals: { bloodPressure: '128/82', heartRate: 72, oxygenLevel: 97 },
    occurredAt: new Date(Date.now() - 1 * 60 * 60000).toISOString(),
    createdBy: { id: 'u-1', fullName: 'Sarah Thompson' },
  },
  {
    id: 't-2',
    type: 'MEDICATION_CHANGE',
    title: 'Medication Logged',
    description: 'Took with breakfast, no issues',
    occurredAt: new Date(Date.now() - 2 * 60 * 60000).toISOString(),
    createdBy: { id: 'u-1', fullName: 'Sarah Thompson' },
  },
  {
    id: 't-3',
    type: 'NOTE',
    title: 'Morning Check-in',
    description: 'Slept well, good appetite this morning. Seemed in good spirits.',
    occurredAt: new Date(Date.now() - 3 * 60 * 60000).toISOString(),
    createdBy: { id: 'u-2', fullName: 'Mike Thompson' },
  },
  {
    id: 't-4',
    type: 'MEAL',
    title: 'Breakfast',
    description: 'Oatmeal with berries, tea',
    occurredAt: new Date(Date.now() - 4 * 60 * 60000).toISOString(),
    createdBy: { id: 'u-1', fullName: 'Sarah Thompson' },
  },
  {
    id: 't-5',
    type: 'SLEEP',
    title: 'Sleep Logged',
    description: '7 hours, woke up once around 3 AM',
    occurredAt: new Date(Date.now() - 8 * 60 * 60000).toISOString(),
    createdBy: { id: 'u-2', fullName: 'Mike Thompson' },
  },
  {
    id: 't-6',
    type: 'INCIDENT',
    title: 'Minor Incident',
    description: 'Tripped on rug but caught herself. No injury.',
    severity: 'MEDIUM',
    occurredAt: new Date(Date.now() - 24 * 60 * 60000).toISOString(),
    createdBy: { id: 'u-1', fullName: 'Sarah Thompson' },
  },
  {
    id: 't-7',
    type: 'MOOD',
    title: 'Mood Check',
    description: 'Feeling a bit tired today, but happy to see grandkids on video call',
    occurredAt: new Date(Date.now() - 26 * 60 * 60000).toISOString(),
    createdBy: { id: 'u-3', fullName: 'Jennifer Thompson' },
  },
  {
    id: 't-8',
    type: 'APPOINTMENT_SUMMARY',
    title: 'Dr. Johnson - Follow-up',
    description: 'Blood pressure looking good. Continue current medications. Next visit in 3 months.',
    occurredAt: new Date(Date.now() - 48 * 60 * 60000).toISOString(),
    createdBy: { id: 'u-1', fullName: 'Sarah Thompson' },
  },
];

const filterOptions = [
  { value: 'all', label: 'All', icon: Activity },
  { value: 'VITALS', label: 'Vitals', icon: Heart },
  { value: 'MEDICATION_CHANGE', label: 'Medications', icon: Pill },
  { value: 'INCIDENT', label: 'Incidents', icon: AlertTriangle },
  { value: 'NOTE', label: 'Notes', icon: FileText },
  { value: 'MOOD', label: 'Mood', icon: Smile },
];

const entryTypes = [
  { type: 'NOTE', label: 'Note', icon: FileText },
  { type: 'VITALS', label: 'Vitals', icon: Heart },
  { type: 'SYMPTOM', label: 'Symptom', icon: AlertTriangle },
  { type: 'MOOD', label: 'Mood', icon: Smile },
  { type: 'MEAL', label: 'Meal', icon: Activity },
  { type: 'INCIDENT', label: 'Incident', icon: AlertTriangle },
];

export default function TimelinePage() {
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedEntryType, setSelectedEntryType] = useState<string | null>(null);

  const filteredTimeline = mockTimeline.filter((entry) => {
    if (filter !== 'all' && entry.type !== filter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        entry.title.toLowerCase().includes(query) ||
        entry.description?.toLowerCase().includes(query) ||
        entry.createdBy.fullName.toLowerCase().includes(query)
      );
    }
    return true;
  });

  return (
    <div className="pb-6">
      <PageHeader
        title="Timeline"
        subtitle="Health log and activity history"
        actions={
          <Button
            variant="primary"
            size="default"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsAddModalOpen(true)}
          >
            Add Entry
          </Button>
        }
      />

      <div className="px-4 sm:px-6 py-6">
        {/* Search */}
        <div className="mb-4">
          <Input
            type="search"
            placeholder="Search timeline..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-5 h-5" />}
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide mb-4">
          {filterOptions.map((option) => {
            const Icon = option.icon;
            const isActive = filter === option.value;
            
            return (
              <button
                key={option.value}
                onClick={() => setFilter(option.value)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap',
                  'border transition-all',
                  isActive
                    ? 'bg-accent-primary text-text-inverse border-accent-primary'
                    : 'bg-bg-surface text-text-secondary border-border-default hover:border-border-strong'
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{option.label}</span>
              </button>
            );
          })}
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Timeline Line */}
          <div className="absolute left-5 top-0 bottom-0 w-px bg-border-subtle" />

          <div className="space-y-6">
            {filteredTimeline.map((entry, index) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="relative pl-12"
              >
                <TimelineEntry entry={entry} />
              </motion.div>
            ))}
          </div>

          {filteredTimeline.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <Activity className="w-12 h-12 mx-auto text-text-tertiary mb-4" />
                <p className="text-text-secondary">No entries found</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Add Entry Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setSelectedEntryType(null);
        }}
        title="Add Timeline Entry"
        description="Record a health observation or note"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm font-medium text-text-primary">What would you like to log?</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {entryTypes.map((type) => {
              const Icon = type.icon;
              const isSelected = selectedEntryType === type.type;
              
              return (
                <button
                  key={type.type}
                  onClick={() => setSelectedEntryType(type.type)}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
                    isSelected
                      ? 'border-accent-primary bg-accent-primary-light'
                      : 'border-border-default hover:border-border-strong'
                  )}
                >
                  <div className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center',
                    isSelected ? 'bg-accent-primary text-text-inverse' : 'bg-bg-muted text-text-secondary'
                  )}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={cn(
                    'text-sm font-medium',
                    isSelected ? 'text-accent-primary' : 'text-text-primary'
                  )}>
                    {type.label}
                  </span>
                </button>
              );
            })}
          </div>

          {selectedEntryType && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-4 pt-4 border-t border-border-subtle"
            >
              <Input label="Title" placeholder="Brief description" />
              
              {selectedEntryType === 'VITALS' && (
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Blood Pressure" placeholder="120/80" />
                  <Input label="Heart Rate" placeholder="72 bpm" type="number" />
                  <Input label="Temperature" placeholder="98.6°F" />
                  <Input label="Oxygen Level" placeholder="98%" type="number" />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Notes (optional)
                </label>
                <textarea
                  placeholder="Additional details..."
                  rows={3}
                  className={cn(
                    'w-full rounded-lg border border-border-default bg-bg-surface',
                    'px-3.5 py-3 text-base text-text-primary placeholder:text-text-tertiary',
                    'focus:outline-none focus:ring-2 focus:ring-border-focus focus:border-border-focus',
                    'resize-none'
                  )}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  size="lg"
                  fullWidth
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setSelectedEntryType(null);
                  }}
                >
                  Cancel
                </Button>
                <Button variant="primary" size="lg" fullWidth>
                  Save Entry
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </Modal>
    </div>
  );
}

