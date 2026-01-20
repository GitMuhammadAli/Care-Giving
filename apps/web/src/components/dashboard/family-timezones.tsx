'use client';

import { useState, useEffect, useMemo, memo } from 'react';
import { Globe, Clock, Phone, MessageCircle, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import { useFamilyMembers } from '@/hooks/use-family';
import { Skeleton } from '@/components/ui/skeleton';

interface FamilyTimezonesProps {
  familyId: string;
}

interface FamilyMemberDisplay {
  id: string;
  name: string;
  role: string;
  timezone: string;
  timezoneAbbr: string;
  utcOffset: number;
  email: string;
  status: 'available' | 'busy' | 'sleeping' | 'offline';
}

const getLocalTime = (utcOffset: number): string => {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const localTime = new Date(utc + (3600000 * utcOffset));
  return localTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

const getTimeOfDay = (utcOffset: number): 'morning' | 'afternoon' | 'evening' | 'night' => {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const localTime = new Date(utc + (3600000 * utcOffset));
  const hour = localTime.getHours();

  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
};

const getStatusFromTimeOfDay = (timeOfDay: string): 'available' | 'busy' | 'sleeping' | 'offline' => {
  if (timeOfDay === 'night') return 'sleeping';
  if (timeOfDay === 'morning' || timeOfDay === 'afternoon') return 'available';
  return 'available';
};

// Estimate UTC offset from timezone (simplified - in production, use a proper timezone library)
const estimateUtcOffset = (): number => {
  // Get the user's local timezone offset in hours
  return -new Date().getTimezoneOffset() / 60;
};

const statusColors: Record<string, { bg: string; dot: string; text: string }> = {
  available: { bg: 'bg-green-500/20', dot: 'bg-green-500', text: 'text-green-700 dark:text-green-400' },
  busy: { bg: 'bg-yellow-500/20', dot: 'bg-yellow-500', text: 'text-yellow-700 dark:text-yellow-400' },
  sleeping: { bg: 'bg-blue-500/20', dot: 'bg-blue-500', text: 'text-blue-700 dark:text-blue-400' },
  offline: { bg: 'bg-muted', dot: 'bg-muted-foreground', text: 'text-muted-foreground' },
};

const timeOfDayEmoji: Record<string, string> = {
  morning: '🌅',
  afternoon: '☀️',
  evening: '🌆',
  night: '🌙',
};

export const FamilyTimezones = memo(function FamilyTimezones({ familyId }: FamilyTimezonesProps) {
  const { data: familyMembers, isLoading } = useFamilyMembers(familyId);
  const [currentTimes, setCurrentTimes] = useState<Record<string, string>>({});
  const [timesOfDay, setTimesOfDay] = useState<Record<string, string>>({});

  // Map family members to display format
  const membersDisplay: FamilyMemberDisplay[] = useMemo(() => {
    if (!familyMembers) return [];

    return familyMembers.map((member) => {
      const utcOffset = estimateUtcOffset(); // Same timezone assumed for now
      const timeOfDay = getTimeOfDay(utcOffset);
      return {
        id: member.id,
        name: member.user.fullName,
        role: member.role === 'ADMIN' ? 'Family Admin' : member.role === 'CAREGIVER' ? 'Caregiver' : 'Family Member',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        timezoneAbbr: new Date().toLocaleTimeString('en-US', { timeZoneName: 'short' }).split(' ')[2] || 'Local',
        utcOffset,
        email: member.user.email,
        status: getStatusFromTimeOfDay(timeOfDay),
      };
    });
  }, [familyMembers]);

  useEffect(() => {
    const updateTimes = () => {
      const times: Record<string, string> = {};
      const todPeriods: Record<string, string> = {};
      membersDisplay.forEach(member => {
        times[member.id] = getLocalTime(member.utcOffset);
        todPeriods[member.id] = getTimeOfDay(member.utcOffset);
      });
      setCurrentTimes(times);
      setTimesOfDay(todPeriods);
    };

    updateTimes();
    const interval = setInterval(updateTimes, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [membersDisplay]);

  const handleCall = (member: FamilyMemberDisplay) => {
    if (member.status === 'sleeping') {
      toast(`It's ${getTimeOfDay(member.utcOffset)} time for ${member.name}. Consider sending a message instead.`);
    } else {
      toast.success(`Calling ${member.name}...`);
    }
  };

  const handleMessage = (member: FamilyMemberDisplay) => {
    toast.success(`Opening chat with ${member.name}...`);
  };

  // Group by timezone
  const groupedByTimezone = membersDisplay.reduce((acc, member) => {
    const key = `${member.timezoneAbbr} (${currentTimes[member.id] || ''})`;
    if (!acc[key]) {
      acc[key] = { members: [], utcOffset: member.utcOffset };
    }
    acc[key].members.push(member);
    return acc;
  }, {} as Record<string, { members: FamilyMemberDisplay[]; utcOffset: number }>);

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (!membersDisplay || membersDisplay.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-serif text-xl text-foreground flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            Family Availability
          </h2>
        </div>
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground">No family members yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-serif text-xl text-foreground flex items-center gap-2">
          <Globe className="w-5 h-5 text-primary" />
          Family Availability
        </h2>
        <Button size="sm" variant="ghost" className="text-primary hover:text-primary hover:bg-primary/10">
          <Video className="w-4 h-4 mr-1" />
          Group Call
        </Button>
      </div>

      <div className="space-y-5">
        {Object.entries(groupedByTimezone).map(([timezone, { members, utcOffset }]) => (
          <div key={timezone}>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">{timezone}</span>
              <span className="text-sm">{timeOfDayEmoji[getTimeOfDay(utcOffset)]}</span>
            </div>
            <div className="space-y-2">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-accent/50 hover:bg-accent transition-colors"
                >
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-sm font-medium text-primary">
                        {member.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card ${statusColors[member.status].dot}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">{member.name}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{member.role}</span>
                      <span className={`text-xs capitalize ${statusColors[member.status].text}`}>
                        • {member.status === 'sleeping' ? '🌙 Likely asleep' : member.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                      onClick={() => handleMessage(member)}
                    >
                      <MessageCircle className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-8 w-8 ${member.status === 'sleeping' ? 'text-muted-foreground/50' : 'text-muted-foreground hover:text-primary'}`}
                      onClick={() => handleCall(member)}
                    >
                      <Phone className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/10">
        <p className="text-xs text-muted-foreground text-center">
          💡 Best time for a group call: <span className="font-medium text-foreground">3:00 PM PST / 6:00 PM EST</span>
        </p>
      </div>
    </div>
  );
});
