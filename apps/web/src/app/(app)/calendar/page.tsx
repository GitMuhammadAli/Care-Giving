'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { cn, formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FamilySpaceSelector } from '@/components/layout/family-space-selector';
import { useFamilySpace } from '@/contexts/family-space-context';
import { appointmentsApi, Appointment } from '@/lib/api';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  MapPin,
  User,
  Bell,
  Repeat,
  AlertTriangle,
  Trash2,
} from 'lucide-react';
import { AddAppointmentModal } from '@/components/modals/add-appointment-modal';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  isToday,
  addMonths,
  subMonths,
  parseISO,
} from 'date-fns';

const appointmentColors: Record<string, { bg: string; text: string }> = {
  DOCTOR_VISIT: { bg: 'bg-info-light', text: 'text-info' },
  PHYSICAL_THERAPY: { bg: 'bg-success-light', text: 'text-success' },
  LAB_WORK: { bg: 'bg-warning-light', text: 'text-warning' },
  IMAGING: { bg: 'bg-chart-purple/10', text: 'text-chart-purple' },
  SPECIALIST: { bg: 'bg-accent-primary-light', text: 'text-accent-primary' },
  HOME_HEALTH: { bg: 'bg-accent-warm-light', text: 'text-accent-warm' },
  OTHER: { bg: 'bg-bg-muted', text: 'text-text-secondary' },
};

export default function CalendarPage() {
  const { selectedCareRecipientId: careRecipientId } = useFamilySpace();
  const queryClient = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Fetch all appointments for the care recipient
  const { data: appointments = [], isLoading, error } = useQuery({
    queryKey: ['appointments', careRecipientId],
    queryFn: () => appointmentsApi.list(careRecipientId!),
    enabled: !!careRecipientId,
  });

  // Delete appointment mutation
  const deleteAppointmentMutation = useMutation({
    mutationFn: (id: string) => appointmentsApi.delete(id),
    onSuccess: () => {
      toast.success('Appointment deleted');
      queryClient.invalidateQueries({ queryKey: ['appointments', careRecipientId] });
    },
    onError: () => {
      toast.error('Failed to delete appointment');
    },
  });

  // Cancel appointment mutation
  const cancelAppointmentMutation = useMutation({
    mutationFn: (id: string) => appointmentsApi.cancel(id),
    onSuccess: () => {
      toast.success('Appointment cancelled');
      queryClient.invalidateQueries({ queryKey: ['appointments', careRecipientId] });
    },
    onError: () => {
      toast.error('Failed to cancel appointment');
    },
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const selectedAppointments = appointments.filter((apt) =>
    isSameDay(parseISO(apt.startTime), selectedDate)
  );

  const getDayAppointments = (day: Date) =>
    appointments.filter((apt) => isSameDay(parseISO(apt.startTime), day));

  if (!careRecipientId) {
    return (
      <div className="pb-6">
        <PageHeader title="Calendar" subtitle="Appointments and schedules" />
        <div className="px-4 sm:px-6 py-6">
          <FamilySpaceSelector />
          <div className="text-center py-12">
            <AlertTriangle className="w-12 h-12 text-warning mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-text-primary mb-2">No Loved One Selected</h2>
            <p className="text-text-secondary">Please select a loved one above to view their appointments.</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="pb-6">
        <PageHeader title="Calendar" subtitle="Appointments and schedules" />
        <div className="px-4 sm:px-6 py-6 space-y-6">
          <FamilySpaceSelector />
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="pb-6">
      <PageHeader
        title="Calendar"
        subtitle="Appointments and schedules"
        actions={
          <Button
            variant="primary"
            size="default"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsAddModalOpen(true)}
          >
            Add Appointment
          </Button>
        }
      />

      <div className="px-4 sm:px-6 py-6">
        {/* Family Space Selector */}
        <FamilySpaceSelector />

        {/* Calendar */}
        <Card className="mb-6">
          <CardContent>
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-2 rounded-lg hover:bg-bg-muted transition-colors touch-target"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-5 h-5 text-text-secondary" />
              </button>
              <h2 className="text-lg font-semibold text-text-primary">
                {format(currentMonth, 'MMMM yyyy')}
              </h2>
              <button
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-2 rounded-lg hover:bg-bg-muted transition-colors touch-target"
                aria-label="Next month"
              >
                <ChevronRight className="w-5 h-5 text-text-secondary" />
              </button>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-medium text-text-tertiary py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day) => {
                const dayAppointments = getDayAppointments(day);
                const isSelected = isSameDay(day, selectedDate);
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isCurrentDay = isToday(day);

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={cn(
                      'relative aspect-square flex flex-col items-center justify-center rounded-lg transition-all touch-target',
                      isSelected
                        ? 'bg-accent-primary text-text-inverse'
                        : isCurrentDay
                        ? 'bg-accent-primary-light text-accent-primary ring-2 ring-accent-primary'
                        : isCurrentMonth
                        ? 'hover:bg-bg-muted text-text-primary'
                        : 'text-text-disabled'
                    )}
                  >
                    <span className={cn('text-sm font-medium', !isCurrentMonth && 'opacity-40')}>
                      {format(day, 'd')}
                    </span>
                    {dayAppointments.length > 0 && (
                      <div className="flex gap-0.5 mt-1">
                        {dayAppointments.slice(0, 3).map((apt, i) => (
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

        {/* Selected Day's Appointments */}
        <div>
          <h3 className="text-lg font-semibold text-text-primary mb-4">
            {formatDate(selectedDate)}
          </h3>

          {selectedAppointments.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CalendarIcon className="w-12 h-12 mx-auto text-text-tertiary mb-4" />
                <p className="text-text-secondary">No appointments scheduled</p>
                <Button
                  variant="secondary"
                  size="default"
                  className="mt-4"
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={() => setIsAddModalOpen(true)}
                >
                  Add Appointment
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {selectedAppointments.map((apt, index) => {
                const colors = appointmentColors[apt.type] || appointmentColors.OTHER;
                const startTime = parseISO(apt.startTime);
                const endTime = apt.endTime ? parseISO(apt.endTime) : null;
                
                return (
                  <motion.div
                    key={apt.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card variant="interactive">
                      <div className="flex gap-4">
                        <div className={cn('w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0', colors.bg)}>
                          <CalendarIcon className={cn('w-7 h-7', colors.text)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-semibold text-text-primary">{apt.title}</h4>
                              <p className="text-sm text-text-secondary mt-0.5">
                                {format(startTime, 'h:mm a')}
                                {endTime && ` - ${format(endTime, 'h:mm a')}`}
                              </p>
                            </div>
                            {apt.recurrence && (
                              <Badge size="sm" variant="default">
                                <Repeat className="w-3 h-3 mr-1" />
                                {apt.recurrence}
                              </Badge>
                            )}
                          </div>

                          <div className="mt-3 space-y-2 text-sm">
                            {apt.location && (
                              <div className="flex items-center gap-2 text-text-secondary">
                                <MapPin className="w-4 h-4 text-text-tertiary" />
                                <span>{apt.location}</span>
                              </div>
                            )}
                            {apt.transportAssignment && (
                              <div className="flex items-center gap-2 text-text-secondary">
                                <User className="w-4 h-4 text-text-tertiary" />
                                <span>Transport: {apt.transportAssignment.assignedTo.fullName}</span>
                              </div>
                            )}
                            {apt.reminderMinutes && apt.reminderMinutes.length > 0 && (
                              <div className="flex items-center gap-2 text-text-secondary">
                                <Bell className="w-4 h-4 text-text-tertiary" />
                                <span>
                                  Reminders: {apt.reminderMinutes.map(m => 
                                    m >= 60 ? `${m / 60}h` : `${m}m`
                                  ).join(', ')} before
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2 mt-4">
                            <Button variant="secondary" size="sm">Edit</Button>
                            {apt.status !== 'CANCELLED' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => cancelAppointmentMutation.mutate(apt.id)}
                                disabled={cancelAppointmentMutation.isPending}
                              >
                                Cancel
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this appointment?')) {
                                  deleteAppointmentMutation.mutate(apt.id);
                                }
                              }}
                              disabled={deleteAppointmentMutation.isPending}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
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

      {/* Add Appointment Modal */}
      {careRecipientId && (
        <AddAppointmentModal
          isOpen={isAddModalOpen}
          onClose={() => {
            setIsAddModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ['appointments', careRecipientId] });
          }}
          careRecipientId={careRecipientId}
          selectedDate={selectedDate}
        />
      )}
    </div>
  );
}

