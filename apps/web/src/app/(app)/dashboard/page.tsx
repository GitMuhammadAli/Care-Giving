'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { PageHeader } from '@/components/layout/page-header';
import { CareRecipientCard } from '@/components/care/care-recipient-card';
import { MedicationCard } from '@/components/care/medication-card';
import { TimelineEntry } from '@/components/care/timeline-entry';
import { EmergencyButton } from '@/components/care/emergency-button';
import { useAuth } from '@/hooks/use-auth';
import { useWebSocket } from '@/hooks/use-websocket';
import { useOfflineSync } from '@/hooks/use-offline-sync';
import { api } from '@/lib/api/client';
import {
  Heart,
  Calendar,
  Pill,
  Clock,
  Activity,
  ChevronRight,
  Bell,
  WifiOff,
  Plus,
  MessageCircle,
  Camera,
  CheckCircle2,
  Users,
  Settings,
  AlertTriangle,
  X,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// Quick actions matching pixel-perfect
const quickActions = [
  { icon: Pill, label: 'Log Medication', action: 'medication', bgClass: 'bg-sage/15', textClass: 'text-sage' },
  { icon: Calendar, label: 'Add Appointment', action: 'appointment', bgClass: 'bg-terracotta/15', textClass: 'text-terracotta' },
  { icon: MessageCircle, label: 'Post Update', action: 'update', bgClass: 'bg-slate/15', textClass: 'text-slate' },
  { icon: Camera, label: 'Share Photo', action: 'photo', bgClass: 'bg-accent', textClass: 'text-foreground' },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const { online, pendingCount } = useOfflineSync();
  
  // Dialog states
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [postUpdateOpen, setPostUpdateOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Form states
  const [newTask, setNewTask] = useState({ title: '', time: '', type: 'activity' });
  const [newUpdate, setNewUpdate] = useState('');
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'overview' | 'medications' | 'contacts' | 'documents'>('overview');
  
  // Get family ID from user
  const familyId = user?.families?.[0]?.id;
  const careRecipientId = user?.families?.[0]?.careRecipients?.[0]?.id;

  // Connect to WebSocket for real-time updates
  useWebSocket(familyId);

  // Fetch dashboard data
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboard', careRecipientId],
    queryFn: async () => {
      if (!careRecipientId) return null;
      
      const [medications, appointments, timeline, currentShift] = await Promise.all([
        api.get(`/care-recipients/${careRecipientId}/medications/schedule/today`).catch(() => []),
        api.get(`/care-recipients/${careRecipientId}/appointments/upcoming?limit=3`).catch(() => []),
        api.get(`/care-recipients/${careRecipientId}/timeline?limit=5`).catch(() => []),
        api.get(`/care-recipients/${careRecipientId}/shifts/current`).catch(() => null),
      ]);

      return { medications, appointments, timeline, currentShift };
    },
    enabled: !!careRecipientId,
    refetchInterval: 60000,
  });

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'medication':
        toast.success('Medication logged successfully!');
        break;
      case 'appointment':
        setAddTaskOpen(true);
        setNewTask({ ...newTask, type: 'appointment' });
        break;
      case 'update':
        setPostUpdateOpen(true);
        break;
      case 'photo':
        toast.success('Photo shared with your care circle!');
        break;
    }
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title || !newTask.time) return;
    setNewTask({ title: '', time: '', type: 'activity' });
    setAddTaskOpen(false);
    toast.success('Task added successfully!');
  };

  const handlePostUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUpdate.trim()) return;
    setNewUpdate('');
    setPostUpdateOpen(false);
    toast.success('Update posted! All circle members will be notified.');
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="pb-6">
        <PageHeader title="Dashboard" />
        <div className="px-4 sm:px-6 py-6 space-y-6">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  const careRecipient = user?.families?.[0]?.careRecipients?.[0];
  const userName = user?.fullName?.split(' ')[0] || 'there';

  return (
    <div className="pb-6">
      {/* Offline indicator */}
      {!online && (
        <div className="bg-terracotta/20 px-4 py-2 flex items-center justify-center gap-2 text-sm text-terracotta">
          <WifiOff className="w-4 h-4" />
          <span>You&apos;re offline. Changes will sync when connected.</span>
          {pendingCount > 0 && <Badge className="bg-terracotta text-foreground">{pendingCount} pending</Badge>}
        </div>
      )}

      <div className="px-4 sm:px-6 py-6">
        {/* Welcome Header - Pixel Perfect Style */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 animate-fade">
          <div>
            <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-1">
              {greeting()}, {userName}
            </h1>
            <p className="text-muted-foreground">{currentDate}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Button
                variant="outline"
                size="icon"
                className="relative border-border hover:bg-accent"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell className="w-5 h-5 text-foreground" />
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive rounded-full border-2 border-background text-[10px] flex items-center justify-center text-white font-medium">
                  2
                </span>
              </Button>

              {showNotifications && (
                <div className="absolute right-0 top-12 w-80 bg-card border border-border rounded-xl shadow-lg z-50 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-foreground">Notifications</h3>
                    <button className="text-xs text-sage hover:text-sage/80">Mark all read</button>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    <div className="p-3 rounded-lg text-sm bg-sage/10">
                      Medication reminder: Aricept refill due in 3 days
                    </div>
                    <div className="p-3 rounded-lg text-sm bg-accent/50">
                      Dr. Roberts added new lab results
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Button variant="outline" size="icon" className="border-border hover:bg-accent">
              <Settings className="w-5 h-5 text-foreground" />
            </Button>

            <Dialog open={addTaskOpen} onOpenChange={setAddTaskOpen}>
              <DialogTrigger asChild>
                <Button variant="editorial">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Task
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Task</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddTask} className="space-y-4 mt-4">
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-2">Task Title</label>
                    <Input
                      value={newTask.title}
                      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                      placeholder="Enter task title"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-2">Time</label>
                    <Input
                      value={newTask.time}
                      onChange={(e) => setNewTask({ ...newTask, time: e.target.value })}
                      placeholder="e.g., 3:00 PM"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-2">Type</label>
                    <select
                      value={newTask.type}
                      onChange={(e) => setNewTask({ ...newTask, type: e.target.value })}
                      className="w-full h-10 px-3 rounded-md border border-border bg-background text-foreground"
                    >
                      <option value="activity">Activity</option>
                      <option value="medication">Medication</option>
                      <option value="appointment">Appointment</option>
                    </select>
                  </div>
                  <Button type="submit" variant="editorial" fullWidth>
                    Add Task
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 border-b border-border">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'medications', label: 'Medications' },
            { id: 'contacts', label: 'Contacts' },
            { id: 'documents', label: 'Documents' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors relative ${
                activeTab === tab.id ? 'text-sage' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-sage" />}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="grid lg:grid-cols-3 gap-6 md:gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Care Circle Card */}
              {careRecipient && (
                <Card padding="spacious" className="animate-fade-delay-1">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-sage/20 flex items-center justify-center">
                        <Heart className="w-8 h-8 text-sage" />
                      </div>
                      <div>
                        <h2 className="font-serif text-xl text-foreground">
                          {careRecipient.preferredName || `${careRecipient.firstName} ${careRecipient.lastName}`}
                        </h2>
                        <p className="text-muted-foreground text-sm">Care Recipient</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="text-sage hover:text-sage hover:bg-sage/10">
                      View Profile
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>

                  {/* Quick Actions */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {quickActions.map((action, index) => (
                      <button
                        key={index}
                        onClick={() => handleQuickAction(action.action)}
                        className="flex flex-col items-center gap-2 p-4 rounded-xl bg-accent/50 hover:bg-accent transition-colors border border-transparent hover:border-border"
                      >
                        <div className={`w-10 h-10 rounded-full ${action.bgClass} flex items-center justify-center`}>
                          <action.icon className={`w-5 h-5 ${action.textClass}`} />
                        </div>
                        <span className="text-sm font-medium text-foreground">{action.label}</span>
                      </button>
                    ))}
                  </div>
                </Card>
              )}

              {/* Today's Schedule */}
              <Card padding="spacious" className="animate-fade-delay-2">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-serif text-xl text-foreground flex items-center gap-2">
                    <Clock className="w-5 h-5 text-sage" />
                    Today&apos;s Schedule
            </h2>
                  <Link href="/calendar">
                    <Button variant="ghost" size="sm" className="text-sage hover:text-sage hover:bg-sage/10">
                      View All
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
          </div>

          <div className="space-y-3">
                  {/* Medications from API */}
                  {(dashboardData?.medications as any[] || []).slice(0, 3).map((med: any) => (
                <MedicationCard
                      key={med.medication?.id || med.id}
                  item={med}
                      onLog={async () => {}}
                />
              ))}

                  {/* Appointments from API */}
                  {(dashboardData?.appointments as any[] || []).slice(0, 2).map((apt: any) => (
                    <div
                      key={apt.id}
                      className="flex items-center gap-4 p-4 rounded-lg bg-accent/50 hover:bg-accent transition-colors border border-transparent hover:border-border"
                    >
                      <div className="w-10 h-10 rounded-full bg-slate/20 flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-slate" />
                  </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{apt.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {apt.doctorName} • {format(new Date(apt.dateTime), 'h:mm a')}
                    </p>
                  </div>
                    </div>
                  ))}

                  {/* Empty state */}
                  {!(dashboardData?.medications as any[] || []).length && !(dashboardData?.appointments as any[] || []).length && (
                    <div className="p-8 text-center text-muted-foreground">Nothing scheduled for today</div>
                  )}
                </div>
              </Card>

              {/* Recent Updates */}
              <Card padding="spacious" className="animate-fade-delay-3">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-serif text-xl text-foreground flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-sage" />
                    Recent Updates
                  </h2>
                  <Dialog open={postUpdateOpen} onOpenChange={setPostUpdateOpen}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-sage hover:text-sage hover:bg-sage/10">
                        <Plus className="w-4 h-4 mr-1" />
                        Post Update
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Post an Update</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handlePostUpdate} className="space-y-4 mt-4">
                        <div>
                          <label className="text-sm font-medium text-foreground block mb-2">
                            Share with your care circle
                          </label>
                          <Textarea
                            value={newUpdate}
                            onChange={(e) => setNewUpdate(e.target.value)}
                            placeholder="How is your loved one doing today?"
                            rows={4}
                            required
                          />
                          <p className="text-xs text-muted-foreground mt-2">
                            All circle members will be notified of this update
                          </p>
          </div>
                        <Button type="submit" variant="editorial" fullWidth>
                          Post Update
              </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
          </div>

                <div className="space-y-4">
              {(dashboardData?.timeline as any[] || []).map((entry: any) => (
                <div key={entry.id} className="p-4">
                  <TimelineEntry entry={entry} />
                </div>
              ))}
              {!(dashboardData?.timeline as any[] || []).length && (
                    <div className="p-8 text-center text-muted-foreground">No recent activity</div>
                  )}
                </div>
              </Card>
            </div>

            {/* Right Sidebar */}
            <div className="space-y-6">
              {/* Care Circle Members */}
              <Card padding="spacious">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-serif text-lg text-foreground flex items-center gap-2">
                    <Users className="w-5 h-5 text-sage" />
                    Care Circle
                  </h2>
                  <Button variant="ghost" size="sm" className="text-sage hover:text-sage hover:bg-sage/10">
                    <Plus className="w-4 h-4 mr-1" />
                    Invite
                  </Button>
                </div>

                <div className="space-y-3">
                  {/* Static members for demo */}
                  {[
                    { name: 'Sarah M.', role: 'Primary Caregiver', status: 'active' },
                    { name: 'David M.', role: 'Family Member', status: 'active' },
                    { name: 'Dr. Roberts', role: 'Healthcare Provider', status: 'active' },
                  ].map((member, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 rounded-lg bg-accent/50 hover:bg-accent transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-sage/20 flex items-center justify-center">
                        <span className="text-sm font-medium text-sage">
                          {member.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground text-sm truncate">{member.name}</p>
                        <p className="text-xs text-muted-foreground">{member.role}</p>
                      </div>
                    </div>
                  ))}
            </div>
          </Card>

              {/* Quick Links */}
              <div className="grid grid-cols-2 gap-4">
          <Link href="/medications">
                  <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer h-full" variant="interactive">
                    <Pill className="w-6 h-6 text-sage mb-2" />
                    <p className="font-medium text-foreground">Medications</p>
                    <p className="text-sm text-muted-foreground">View schedule</p>
            </Card>
          </Link>
          <Link href="/calendar">
                  <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer h-full" variant="interactive">
                    <Calendar className="w-6 h-6 text-sage mb-2" />
                    <p className="font-medium text-foreground">Calendar</p>
                    <p className="text-sm text-muted-foreground">Appointments</p>
                  </Card>
                </Link>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'medications' && (
          <div className="max-w-4xl">
            <Card padding="spacious">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-serif text-xl text-foreground flex items-center gap-2">
                  <Pill className="w-5 h-5 text-sage" />
                  Medications
                </h2>
                <Button variant="ghost" size="sm" className="text-sage hover:text-sage hover:bg-sage/10">
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </div>
              <p className="text-muted-foreground">Medication tracking view - coming soon</p>
            </Card>
          </div>
        )}

        {activeTab === 'contacts' && (
          <div className="max-w-4xl">
            <Card padding="spacious">
              <h2 className="font-serif text-xl text-foreground mb-4">Contacts Directory</h2>
              <p className="text-muted-foreground">Contacts view - coming soon</p>
            </Card>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="max-w-4xl">
            <Card padding="spacious">
              <h2 className="font-serif text-xl text-foreground mb-4">Documents Vault</h2>
              <p className="text-muted-foreground">Documents view - coming soon</p>
            </Card>
          </div>
        )}
      </div>

      {/* Emergency Button */}
      {careRecipientId && <EmergencyButton careRecipientId={careRecipientId} />}
    </div>
  );
}
