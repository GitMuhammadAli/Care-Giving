'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { cn, formatDate } from '@/lib/utils';
import { FamilySpaceSelector } from '@/components/layout/family-space-selector';
import { useFamilySpace } from '@/contexts/family-space-context';
import { useAuth } from '@/hooks/use-auth';
import { shiftsApi, familyApi, type CaregiverShift, type CreateShiftDto } from '@/lib/api';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Calendar,
  Clock,
  CheckCircle2,
  LogIn,
  LogOut,
  MessageSquare,
  ChevronRight,
  AlertCircle,
  X,
} from 'lucide-react';
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isToday,
  addWeeks,
  subWeeks,
} from 'date-fns';

const statusConfig = {
  SCHEDULED: { label: 'Scheduled', color: 'bg-bg-muted text-text-secondary' },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-success-light text-success' },
  COMPLETED: { label: 'Completed', color: 'bg-accent-primary-light text-accent-primary' },
  CANCELLED: { label: 'Cancelled', color: 'bg-error-light text-error' },
  NO_SHOW: { label: 'No Show', color: 'bg-warning-light text-warning' },
};

export default function CaregiversPage() {
  const { selectedFamilyId: familyId, selectedCareRecipientId: careRecipientId } = useFamilySpace();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Dialog states
  const [createShiftOpen, setCreateShiftOpen] = useState(false);
  const [checkInShiftId, setCheckInShiftId] = useState<string | null>(null);
  const [checkOutShiftId, setCheckOutShiftId] = useState<string | null>(null);

  // Form states
  const [shiftForm, setShiftForm] = useState({
    caregiverId: '',
    startTime: '',
    endTime: '',
    notes: '',
  });

  const [checkInForm, setCheckInForm] = useState({
    notes: '',
    location: '',
  });

  const [checkOutForm, setCheckOutForm] = useState({
    notes: '',
    location: '',
    handoffNotes: '',
  });

  const weekStart = startOfWeek(currentWeek);
  const weekEnd = endOfWeek(currentWeek);
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Fetch family members (potential caregivers)
  const { data: familyMembers = [] } = useQuery({
    queryKey: ['family-members', familyId],
    queryFn: () => familyApi.getMembers(familyId!),
    enabled: !!familyId,
  });

  // Fetch shifts
  const { data: shifts = [], isLoading: shiftsLoading } = useQuery({
    queryKey: ['shifts', careRecipientId],
    queryFn: () => shiftsApi.getAll(careRecipientId!),
    enabled: !!careRecipientId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch on-duty caregiver
  const { data: onDuty } = useQuery({
    queryKey: ['on-duty', careRecipientId],
    queryFn: () => shiftsApi.getOnDuty(careRecipientId!),
    enabled: !!careRecipientId,
    refetchInterval: 30000,
  });

  // Create shift mutation
  const createShiftMutation = useMutation({
    mutationFn: (data: CreateShiftDto) => shiftsApi.create(careRecipientId!, data),
    onSuccess: () => {
      toast.success('Shift created successfully');
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      queryClient.invalidateQueries({ queryKey: ['on-duty'] });
      setCreateShiftOpen(false);
      setShiftForm({ caregiverId: '', startTime: '', endTime: '', notes: '' });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to create shift');
    },
  });

  // Check in mutation
  const checkInMutation = useMutation({
    mutationFn: ({ shiftId, data }: { shiftId: string; data: typeof checkInForm }) =>
      shiftsApi.checkIn(careRecipientId!, shiftId, data),
    onSuccess: () => {
      toast.success('Checked in successfully');
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      queryClient.invalidateQueries({ queryKey: ['on-duty'] });
      setCheckInShiftId(null);
      setCheckInForm({ notes: '', location: '' });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to check in');
    },
  });

  // Check out mutation
  const checkOutMutation = useMutation({
    mutationFn: ({ shiftId, data }: { shiftId: string; data: typeof checkOutForm }) =>
      shiftsApi.checkOut(careRecipientId!, shiftId, data),
    onSuccess: () => {
      toast.success('Checked out successfully');
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      queryClient.invalidateQueries({ queryKey: ['on-duty'] });
      setCheckOutShiftId(null);
      setCheckOutForm({ notes: '', location: '', handoffNotes: '' });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to check out');
    },
  });

  // Cancel shift mutation
  const cancelShiftMutation = useMutation({
    mutationFn: (shiftId: string) => shiftsApi.cancel(careRecipientId!, shiftId),
    onSuccess: () => {
      toast.success('Shift cancelled');
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to cancel shift');
    },
  });

  const getShiftsForDay = (day: Date) =>
    shifts.filter((s) => isSameDay(new Date(s.startTime), day));

  const selectedDayShifts = getShiftsForDay(selectedDate);

  const handleCreateShift = () => {
    if (!shiftForm.caregiverId || !shiftForm.startTime || !shiftForm.endTime) {
      toast.error('Please fill all required fields');
      return;
    }

    createShiftMutation.mutate({
      caregiverId: shiftForm.caregiverId,
      startTime: shiftForm.startTime,
      endTime: shiftForm.endTime,
      notes: shiftForm.notes || undefined,
    });
  };

  const handleCheckIn = (shiftId: string) => {
    checkInMutation.mutate({
      shiftId,
      data: checkInForm,
    });
  };

  const handleCheckOut = (shiftId: string) => {
    if (!checkOutForm.handoffNotes?.trim()) {
      toast.error('Please provide handoff notes');
      return;
    }

    checkOutMutation.mutate({
      shiftId,
      data: checkOutForm,
    });
  };

  if (!careRecipientId) {
    return (
      <div className="pb-6">
        <PageHeader title="Caregiver Schedule" subtitle="Shifts and handoffs" />
        <div className="px-4 sm:px-6 py-6">
          <FamilySpaceSelector />
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="w-12 h-12 mx-auto text-text-tertiary mb-4" />
              <p className="text-text-secondary">No loved one selected</p>
              <p className="text-sm text-text-tertiary mt-2">
                Please select a loved one above to manage shifts
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
        title="Caregiver Schedule"
        subtitle="Shifts and handoffs"
        actions={
          <Button
            variant="primary"
            size="default"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setCreateShiftOpen(true)}
          >
            Add Shift
          </Button>
        }
      />

      <div className="px-4 sm:px-6 py-6 space-y-6">
        {/* Family Space Selector */}
        <FamilySpaceSelector />

        {/* Current On Duty */}
        {onDuty && (
          <Card variant="success">
            <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-wrap sm:flex-nowrap">
              <Avatar
                name={onDuty.caregiver.fullName}
                src={onDuty.caregiver.avatarUrl}
                size="lg"
                showStatus
                status="online"
                className="flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-success uppercase tracking-wide">
                  Currently On Duty
                </p>
                <h3 className="text-base sm:text-lg font-semibold text-text-primary truncate">
                  {onDuty.caregiver.fullName}
                </h3>
                <p className="text-xs sm:text-sm text-text-secondary">
                  {format(new Date(onDuty.shift.startTime), 'h:mm a')} -{' '}
                  {format(new Date(onDuty.shift.endTime), 'h:mm a')}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <Badge variant="success">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  Checked In
                </Badge>
                {onDuty.shift.actualStartTime && (
                  <p className="text-xs text-text-tertiary mt-1">
                    Since {format(new Date(onDuty.shift.actualStartTime), 'h:mm a')}
                  </p>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Week View */}
        <Card>
          <CardContent>
            {/* Week Navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
                className="p-2 rounded-lg hover:bg-bg-muted transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-text-secondary rotate-180" />
              </button>
              <h3 className="text-sm sm:text-base font-semibold text-text-primary">
                {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
              </h3>
              <button
                onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
                className="p-2 rounded-lg hover:bg-bg-muted transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-text-secondary" />
              </button>
            </div>

            {/* Day Pills */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {weekDays.map((day) => {
                const dayShifts = getShiftsForDay(day);
                const isSelected = isSameDay(day, selectedDate);
                const isTodayDay = isToday(day);

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={cn(
                      'flex flex-col items-center min-w-[48px] sm:min-w-[56px] py-2 sm:py-3 px-1.5 sm:px-2 rounded-xl transition-all',
                      isSelected
                        ? 'bg-accent-primary text-text-inverse'
                        : isTodayDay
                        ? 'bg-accent-primary-light text-accent-primary'
                        : 'hover:bg-bg-muted'
                    )}
                  >
                    <span className="text-xs font-medium opacity-60">
                      {format(day, 'EEE')}
                    </span>
                    <span className="text-lg font-semibold">{format(day, 'd')}</span>
                    {dayShifts.length > 0 && (
                      <div className="flex gap-0.5 mt-1">
                        {dayShifts.slice(0, 3).map((_, i) => (
                          <div
                            key={i}
                            className={cn(
                              'w-1.5 h-1.5 rounded-full',
                              isSelected ? 'bg-text-inverse' : 'bg-accent-primary'
                            )}
                          />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Selected Day's Shifts */}
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-text-primary mb-4">
            {formatDate(selectedDate)}
          </h3>

          {shiftsLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Card key={i}>
                  <div className="flex items-start gap-4">
                    <Skeleton className="w-12 h-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-48" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : selectedDayShifts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="w-12 h-12 mx-auto text-text-tertiary mb-4" />
                <p className="text-text-secondary">No shifts scheduled</p>
                <Button
                  variant="secondary"
                  size="default"
                  className="mt-4"
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={() => setCreateShiftOpen(true)}
                >
                  Add Shift
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {selectedDayShifts.map((shift, index) => {
                const status = statusConfig[shift.status as keyof typeof statusConfig];
                const canCheckIn =
                  shift.status === 'SCHEDULED' &&
                  isSameDay(new Date(shift.startTime), new Date()) &&
                  shift.caregiverId === user?.id;
                const canCheckOut =
                  shift.status === 'IN_PROGRESS' && shift.caregiverId === user?.id;

                return (
                  <motion.div
                    key={shift.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card variant={shift.status === 'IN_PROGRESS' ? 'success' : 'interactive'}>
                      <div className="flex items-start gap-3 sm:gap-4">
                        <Avatar
                          name={shift.caregiver?.fullName || 'Unknown'}
                          src={shift.caregiver?.avatarUrl}
                          size="lg"
                          className="flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-semibold text-text-primary text-sm sm:text-base truncate">
                              {shift.caregiver?.fullName || 'Unknown'}
                            </h4>
                            <Badge className={status.color} size="sm">
                              {status.label}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1 text-xs sm:text-sm text-text-secondary">
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {format(new Date(shift.startTime), 'h:mm a')} -{' '}
                              {format(new Date(shift.endTime), 'h:mm a')}
                            </span>
                          </div>

                          {/* Check-in/Check-out Info */}
                          {shift.actualStartTime && (
                            <div className="flex items-center gap-3 mt-2 text-xs text-text-tertiary">
                              <span className="flex items-center gap-1">
                                <LogIn className="w-3.5 h-3.5 text-success" />
                                In: {format(new Date(shift.actualStartTime), 'h:mm a')}
                              </span>
                              {shift.actualEndTime && (
                                <span className="flex items-center gap-1">
                                  <LogOut className="w-3.5 h-3.5 text-accent-primary" />
                                  Out: {format(new Date(shift.actualEndTime), 'h:mm a')}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Check-in Notes */}
                          {shift.checkInNotes && (
                            <div className="mt-3 p-3 bg-bg-muted rounded-lg">
                              <p className="text-xs font-medium text-text-tertiary mb-1">
                                Check-in Notes
                              </p>
                              <p className="text-sm text-text-secondary">{shift.checkInNotes}</p>
                            </div>
                          )}

                          {/* Handoff Notes */}
                          {shift.handoffNotes && (
                            <div className="mt-3 p-3 bg-bg-muted rounded-lg">
                              <p className="text-xs font-medium text-text-tertiary mb-1 flex items-center gap-1">
                                <MessageSquare className="w-3.5 h-3.5" />
                                Handoff Notes
                              </p>
                              <p className="text-sm text-text-secondary">{shift.handoffNotes}</p>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex flex-wrap gap-2 mt-3">
                            {canCheckIn && (
                              <Button
                                variant="primary"
                                size="sm"
                                leftIcon={<LogIn className="w-4 h-4" />}
                                onClick={() => setCheckInShiftId(shift.id)}
                              >
                                Check In
                              </Button>
                            )}

                            {canCheckOut && (
                              <Button
                                variant="warm"
                                size="sm"
                                leftIcon={<LogOut className="w-4 h-4" />}
                                onClick={() => setCheckOutShiftId(shift.id)}
                              >
                                Check Out
                              </Button>
                            )}

                            {shift.status === 'SCHEDULED' && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                  if (confirm('Are you sure you want to cancel this shift?')) {
                                    cancelShiftMutation.mutate(shift.id);
                                  }
                                }}
                              >
                                Cancel
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create Shift Dialog */}
      <Dialog open={createShiftOpen} onOpenChange={setCreateShiftOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Shift</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-text-primary mb-2 block">
                Caregiver *
              </label>
              <Select
                value={shiftForm.caregiverId}
                onValueChange={(value) =>
                  setShiftForm((prev) => ({ ...prev, caregiverId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select caregiver" />
                </SelectTrigger>
                <SelectContent>
                  {familyMembers.map((member) => (
                    <SelectItem key={member.userId} value={member.userId}>
                      {member.user.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-text-primary mb-2 block">
                Start Time *
              </label>
              <Input
                type="datetime-local"
                value={shiftForm.startTime}
                onChange={(e) =>
                  setShiftForm((prev) => ({ ...prev, startTime: e.target.value }))
                }
              />
            </div>

            <div>
              <label className="text-sm font-medium text-text-primary mb-2 block">
                End Time *
              </label>
              <Input
                type="datetime-local"
                value={shiftForm.endTime}
                onChange={(e) =>
                  setShiftForm((prev) => ({ ...prev, endTime: e.target.value }))
                }
              />
            </div>

            <div>
              <label className="text-sm font-medium text-text-primary mb-2 block">Notes</label>
              <Textarea
                value={shiftForm.notes}
                onChange={(e) =>
                  setShiftForm((prev) => ({ ...prev, notes: e.target.value }))
                }
                placeholder="Any additional notes..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setCreateShiftOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateShift}
              disabled={createShiftMutation.isPending}
            >
              {createShiftMutation.isPending ? 'Creating...' : 'Create Shift'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Check-in Dialog */}
      <Dialog open={!!checkInShiftId} onOpenChange={() => setCheckInShiftId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Check In to Shift</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-text-primary mb-2 block">
                Check-in Notes
              </label>
              <Textarea
                value={checkInForm.notes}
                onChange={(e) =>
                  setCheckInForm((prev) => ({ ...prev, notes: e.target.value }))
                }
                placeholder="How is the care recipient today?"
                rows={3}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-text-primary mb-2 block">Location</label>
              <Input
                value={checkInForm.location}
                onChange={(e) =>
                  setCheckInForm((prev) => ({ ...prev, location: e.target.value }))
                }
                placeholder="e.g., Home, Hospital"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setCheckInShiftId(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => handleCheckIn(checkInShiftId!)}
              disabled={checkInMutation.isPending}
            >
              {checkInMutation.isPending ? 'Checking In...' : 'Check In'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Check-out Dialog */}
      <Dialog open={!!checkOutShiftId} onOpenChange={() => setCheckOutShiftId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Check Out from Shift</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-text-primary mb-2 block">
                Handoff Notes *
              </label>
              <Textarea
                value={checkOutForm.handoffNotes}
                onChange={(e) =>
                  setCheckOutForm((prev) => ({ ...prev, handoffNotes: e.target.value }))
                }
                placeholder="Important information for the next caregiver..."
                rows={4}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-text-primary mb-2 block">
                Check-out Notes
              </label>
              <Textarea
                value={checkOutForm.notes}
                onChange={(e) =>
                  setCheckOutForm((prev) => ({ ...prev, notes: e.target.value }))
                }
                placeholder="Summary of the shift..."
                rows={3}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-text-primary mb-2 block">Location</label>
              <Input
                value={checkOutForm.location}
                onChange={(e) =>
                  setCheckOutForm((prev) => ({ ...prev, location: e.target.value }))
                }
                placeholder="e.g., Home, Hospital"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setCheckOutShiftId(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => handleCheckOut(checkOutShiftId!)}
              disabled={checkOutMutation.isPending}
            >
              {checkOutMutation.isPending ? 'Checking Out...' : 'Check Out'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
