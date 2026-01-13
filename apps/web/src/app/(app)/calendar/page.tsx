'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn, formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  MapPin,
  User,
  Bell,
  Repeat,
} from 'lucide-react';
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
} from 'date-fns';

// Mock appointments
const mockAppointments = [
  {
    id: 'apt-1',
    title: 'Dr. Smith - Cardiology',
    type: 'DOCTOR_VISIT',
    date: new Date(),
    startTime: '2:30 PM',
    endTime: '3:30 PM',
    location: 'Main Street Medical Center',
    address: '123 Main St, Springfield',
    transport: 'Sarah',
    reminders: ['1 day', '1 hour'],
  },
  {
    id: 'apt-2',
    title: 'Physical Therapy',
    type: 'PHYSICAL_THERAPY',
    date: new Date(),
    startTime: '4:00 PM',
    endTime: '5:00 PM',
    location: 'PT Plus',
    address: '456 Oak Ave, Springfield',
    transport: 'Mike',
    recurring: 'Weekly on Wednesdays',
  },
  {
    id: 'apt-3',
    title: 'Lab Work',
    type: 'LAB_WORK',
    date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    startTime: '9:00 AM',
    endTime: '9:30 AM',
    location: 'Quest Diagnostics',
    address: '789 Health Blvd',
    transport: 'Sarah',
  },
];

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
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const selectedAppointments = mockAppointments.filter((apt) =>
    isSameDay(apt.date, selectedDate)
  );

  const getDayAppointments = (day: Date) =>
    mockAppointments.filter((apt) => isSameDay(apt.date, day));

  return (
    <div className="pb-6">
      <PageHeader
        title="Calendar"
        subtitle="Appointments and schedules"
        actions={
          <Button variant="primary" size="default" leftIcon={<Plus className="w-4 h-4" />}>
            Add Appointment
          </Button>
        }
      />

      <div className="px-4 sm:px-6 py-6">
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
                <Button variant="secondary" size="default" className="mt-4" leftIcon={<Plus className="w-4 h-4" />}>
                  Add Appointment
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {selectedAppointments.map((apt, index) => {
                const colors = appointmentColors[apt.type] || appointmentColors.OTHER;
                
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
                                {apt.startTime} - {apt.endTime}
                              </p>
                            </div>
                            {apt.recurring && (
                              <Badge size="sm" variant="default">
                                <Repeat className="w-3 h-3 mr-1" />
                                Weekly
                              </Badge>
                            )}
                          </div>

                          <div className="mt-3 space-y-2 text-sm">
                            <div className="flex items-center gap-2 text-text-secondary">
                              <MapPin className="w-4 h-4 text-text-tertiary" />
                              <span>{apt.location}</span>
                            </div>
                            <div className="flex items-center gap-2 text-text-secondary">
                              <User className="w-4 h-4 text-text-tertiary" />
                              <span>Transport: {apt.transport}</span>
                            </div>
                            {apt.reminders && (
                              <div className="flex items-center gap-2 text-text-secondary">
                                <Bell className="w-4 h-4 text-text-tertiary" />
                                <span>Reminder: {apt.reminders.join(', ')}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2 mt-4">
                            <Button variant="secondary" size="sm">Edit</Button>
                            <Button variant="ghost" size="sm">Cancel</Button>
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
    </div>
  );
}

