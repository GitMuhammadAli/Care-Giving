'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { FamilySpaceSelector } from '@/components/layout/family-space-selector';
import { useFamilySpace } from '@/contexts/family-space-context';
import { timelineApi, type CreateTimelineEntryInput } from '@/lib/api';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Modal, ModalFooter } from '@/components/ui/modal';
import { TimelineEntry, TimelineEntryData } from '@/components/care/timeline-entry';
import { Skeleton } from '@/components/ui/skeleton';
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
  const { selectedCareRecipientId: careRecipientId } = useFamilySpace();
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedEntryType, setSelectedEntryType] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    bloodPressure: '',
    heartRate: '',
    temperature: '',
    oxygenLevel: '',
  });

  // Fetch timeline entries
  const { data: timelineData, isLoading } = useQuery({
    queryKey: ['timeline', careRecipientId, filter !== 'all' ? filter : undefined],
    queryFn: () => timelineApi.list(careRecipientId!, { type: filter !== 'all' ? filter : undefined }),
    enabled: !!careRecipientId,
  });
  const timeline = Array.isArray(timelineData) ? timelineData : [];

  // Create entry mutation
  const createEntryMutation = useMutation({
    mutationFn: (data: CreateTimelineEntryInput) => timelineApi.create(careRecipientId!, data),
    onSuccess: () => {
      toast.success('Entry added successfully');
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
      setIsAddModalOpen(false);
      setSelectedEntryType(null);
      setFormData({
        title: '',
        description: '',
        bloodPressure: '',
        heartRate: '',
        temperature: '',
        oxygenLevel: '',
      });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to add entry');
    },
  });

  // Delete entry mutation
  const deleteEntryMutation = useMutation({
    mutationFn: (id: string) => timelineApi.delete(id),
    onSuccess: () => {
      toast.success('Entry deleted');
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
    },
    onError: () => {
      toast.error('Failed to delete entry');
    },
  });

  const handleDeleteEntry = (entry: TimelineEntryData) => {
    if (confirm(`Are you sure you want to delete this entry?`)) {
      deleteEntryMutation.mutate(entry.id);
    }
  };

  const filteredTimeline = timeline.filter((entry) => {
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

  const handleSaveEntry = () => {
    if (!selectedEntryType || !formData.title) {
      toast.error('Please fill in required fields');
      return;
    }

    const entryData: CreateTimelineEntryInput = {
      type: selectedEntryType,
      title: formData.title,
      description: formData.description || undefined,
    };

    if (selectedEntryType === 'VITALS') {
      entryData.vitals = {
        bloodPressure: formData.bloodPressure || undefined,
        heartRate: formData.heartRate ? Number(formData.heartRate) : undefined,
        temperature: formData.temperature ? Number(formData.temperature) : undefined,
        oxygenLevel: formData.oxygenLevel ? Number(formData.oxygenLevel) : undefined,
      };
    }

    createEntryMutation.mutate(entryData);
  };

  if (!careRecipientId) {
    return (
      <div className="pb-6">
        <PageHeader title="Timeline" subtitle="Health log and activity history" />
        <div className="px-4 sm:px-6 py-6">
          <FamilySpaceSelector />
          <Card>
            <CardContent className="py-12 text-center">
              <AlertTriangle className="w-12 h-12 mx-auto text-text-tertiary mb-4" />
              <p className="text-text-secondary">No loved one selected</p>
              <p className="text-sm text-text-tertiary mt-2">
                Please select a loved one above to view timeline
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
        {/* Family Space Selector */}
        <FamilySpaceSelector />

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

        {/* Loading State */}
        {isLoading ? (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="relative pl-12">
                <Card>
                  <div className="space-y-3">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </Card>
              </div>
            ))}
          </div>
        ) : (
          /* Timeline */
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
                  <TimelineEntry
                    entry={entry}
                    onDelete={handleDeleteEntry}
                  />
                </motion.div>
              ))}
            </div>

            {filteredTimeline.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <Activity className="w-12 h-12 mx-auto text-text-tertiary mb-4" />
                  <p className="text-text-secondary">No entries found</p>
                  <Button
                    variant="secondary"
                    size="default"
                    className="mt-4"
                    leftIcon={<Plus className="w-4 h-4" />}
                    onClick={() => setIsAddModalOpen(true)}
                  >
                    Add Entry
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}
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
              <Input
                label="Title *"
                placeholder="Brief description"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />

              {selectedEntryType === 'VITALS' && (
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Blood Pressure"
                    placeholder="120/80"
                    value={formData.bloodPressure}
                    onChange={(e) => setFormData({ ...formData, bloodPressure: e.target.value })}
                  />
                  <Input
                    label="Heart Rate"
                    placeholder="72 bpm"
                    type="number"
                    value={formData.heartRate}
                    onChange={(e) => setFormData({ ...formData, heartRate: e.target.value })}
                  />
                  <Input
                    label="Temperature"
                    placeholder="98.6°F"
                    value={formData.temperature}
                    onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
                  />
                  <Input
                    label="Oxygen Level"
                    placeholder="98%"
                    type="number"
                    value={formData.oxygenLevel}
                    onChange={(e) => setFormData({ ...formData, oxygenLevel: e.target.value })}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Notes (optional)
                </label>
                <textarea
                  placeholder="Additional details..."
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={handleSaveEntry}
                  disabled={createEntryMutation.isPending}
                >
                  {createEntryMutation.isPending ? 'Saving...' : 'Save Entry'}
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </Modal>
    </div>
  );
}

