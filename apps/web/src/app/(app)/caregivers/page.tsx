'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn, formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import {
  Plus,
  Calendar,
  Clock,
  CheckCircle2,
  LogIn,
  LogOut,
  MessageSquare,
  ChevronRight,
  User,
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

const mockShifts = [
  {
    id: 'shift-1',
    caregiver: { id: 'u-1', name: 'Sarah Thompson' },
    date: new Date(),
    startTime: '8:00 AM',
    endTime: '6:00 PM',
    status: 'IN_PROGRESS',
    checkedInAt: new Date().setHours(7, 55, 0, 0),
  },
  {
    id: 'shift-2',
    caregiver: { id: 'u-2', name: 'Mike Thompson' },
    date: new Date(),
    startTime: '6:00 PM',
    endTime: '10:00 PM',
    status: 'SCHEDULED',
  },
  {
    id: 'shift-3',
    caregiver: { id: 'u-1', name: 'Sarah Thompson' },
    date: new Date(Date.now() + 24 * 60 * 60000),
    startTime: '8:00 AM',
    endTime: '2:00 PM',
    status: 'SCHEDULED',
  },
  {
    id: 'shift-4',
    caregiver: { id: 'u-3', name: 'Jennifer Thompson' },
    date: new Date(Date.now() + 24 * 60 * 60000),
    startTime: '2:00 PM',
    endTime: '8:00 PM',
    status: 'SCHEDULED',
  },
  {
    id: 'shift-5',
    caregiver: { id: 'u-2', name: 'Mike Thompson' },
    date: new Date(Date.now() - 24 * 60 * 60000),
    startTime: '8:00 AM',
    endTime: '6:00 PM',
    status: 'COMPLETED',
    checkedInAt: new Date(Date.now() - 24 * 60 * 60000).setHours(7, 58, 0, 0),
    checkedOutAt: new Date(Date.now() - 24 * 60 * 60000).setHours(18, 5, 0, 0),
    handoffNotes: 'Good day overall. Took all medications. Ate well. No concerns.',
  },
];

const statusConfig = {
  SCHEDULED: { label: 'Scheduled', color: 'bg-bg-muted text-text-secondary' },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-success-light text-success' },
  COMPLETED: { label: 'Completed', color: 'bg-accent-primary-light text-accent-primary' },
  CANCELLED: { label: 'Cancelled', color: 'bg-error-light text-error' },
};

export default function CaregiversPage() {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const weekStart = startOfWeek(currentWeek);
  const weekEnd = endOfWeek(currentWeek);
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const currentShift = mockShifts.find(
    (s) => s.status === 'IN_PROGRESS' && isSameDay(s.date, new Date())
  );

  const selectedDayShifts = mockShifts.filter((s) => isSameDay(s.date, selectedDate));

  const getShiftsForDay = (day: Date) => mockShifts.filter((s) => isSameDay(s.date, day));

  return (
    <div className="pb-6">
      <PageHeader
        title="Caregiver Schedule"
        subtitle="Shifts and handoffs"
        actions={
          <Button variant="primary" size="default" leftIcon={<Plus className="w-4 h-4" />}>
            Add Shift
          </Button>
        }
      />

      <div className="px-4 sm:px-6 py-6 space-y-6">
        {/* Current On Duty */}
        {currentShift && (
          <Card variant="success">
            <div className="flex items-center gap-4">
              <Avatar name={currentShift.caregiver.name} size="lg" showStatus status="online" />
              <div className="flex-1">
                <p className="text-xs font-medium text-success uppercase tracking-wide">Currently On Duty</p>
                <h3 className="text-lg font-semibold text-text-primary">{currentShift.caregiver.name}</h3>
                <p className="text-sm text-text-secondary">
                  {currentShift.startTime} - {currentShift.endTime}
                </p>
              </div>
              <div className="text-right">
                <Badge variant="success">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  Checked In
                </Badge>
                <p className="text-xs text-text-tertiary mt-1">
                  Since 7:55 AM
                </p>
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
              <h3 className="text-base font-semibold text-text-primary">
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
                      'flex flex-col items-center min-w-[56px] py-3 px-2 rounded-xl transition-all',
                      isSelected
                        ? 'bg-accent-primary text-text-inverse'
                        : isTodayDay
                        ? 'bg-accent-primary-light text-accent-primary'
                        : 'hover:bg-bg-muted'
                    )}
                  >
                    <span className="text-xs font-medium opacity-60">{format(day, 'EEE')}</span>
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
          <h3 className="text-lg font-semibold text-text-primary mb-4">
            {formatDate(selectedDate)}
          </h3>

          {selectedDayShifts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="w-12 h-12 mx-auto text-text-tertiary mb-4" />
                <p className="text-text-secondary">No shifts scheduled</p>
                <Button variant="secondary" size="default" className="mt-4" leftIcon={<Plus className="w-4 h-4" />}>
                  Add Shift
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {selectedDayShifts.map((shift, index) => {
                const status = statusConfig[shift.status as keyof typeof statusConfig];

                return (
                  <motion.div
                    key={shift.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card variant={shift.status === 'IN_PROGRESS' ? 'success' : 'interactive'}>
                      <div className="flex items-start gap-4">
                        <Avatar name={shift.caregiver.name} size="lg" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-text-primary">{shift.caregiver.name}</h4>
                            <Badge className={status.color} size="sm">{status.label}</Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-sm text-text-secondary">
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {shift.startTime} - {shift.endTime}
                            </span>
                          </div>

                          {/* Check-in/Check-out Info */}
                          {shift.checkedInAt && (
                            <div className="flex items-center gap-3 mt-2 text-xs text-text-tertiary">
                              <span className="flex items-center gap-1">
                                <LogIn className="w-3.5 h-3.5 text-success" />
                                In: {format(new Date(shift.checkedInAt), 'h:mm a')}
                              </span>
                              {shift.checkedOutAt && (
                                <span className="flex items-center gap-1">
                                  <LogOut className="w-3.5 h-3.5 text-accent-primary" />
                                  Out: {format(new Date(shift.checkedOutAt), 'h:mm a')}
                                </span>
                              )}
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
                          {shift.status === 'SCHEDULED' && isSameDay(shift.date, new Date()) && (
                            <div className="flex gap-2 mt-3">
                              <Button variant="primary" size="sm" leftIcon={<LogIn className="w-4 h-4" />}>
                                Check In
                              </Button>
                            </div>
                          )}

                          {shift.status === 'IN_PROGRESS' && (
                            <div className="flex gap-2 mt-3">
                              <Button variant="warm" size="sm" leftIcon={<LogOut className="w-4 h-4" />}>
                                Check Out
                              </Button>
                            </div>
                          )}
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
    </div>
  );
}

