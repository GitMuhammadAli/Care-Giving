'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Heart,
  Calendar,
  Pill,
  MessageCircle,
  Users,
  Plus,
  Bell,
  Clock,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  Settings,
  RefreshCw,
  X,
  Mail,
  Pencil,
  UserPlus,
  Home,
  Check,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// Import dashboard components
import { EmergencyAlertBanner } from '@/components/dashboard/emergency-alert-banner';
import { FamilyTimezones } from '@/components/dashboard/family-timezones';
import { EmergencyContacts } from '@/components/dashboard/emergency-contacts';
import { MedicationTracker } from '@/components/dashboard/medication-tracker';
import { ContactsDirectory } from '@/components/dashboard/contacts-directory';
import { DocumentsVault } from '@/components/dashboard/documents-vault';
import { Skeleton } from '@/components/ui/skeleton';
import { ComingSoonBadge } from '@/components/ui/coming-soon-badge';
import { AddCareRecipientModal } from '@/components/modals/add-care-recipient-modal';
import { EditCareRecipientModal } from '@/components/modals/edit-care-recipient-modal';
import { FamilySpaceSelector } from '@/components/layout/family-space-selector';

// Hooks
import { useAuth } from '@/hooks/use-auth';
import { useFamilyMembers, useFamilies, useInviteMember, usePendingInvitations, useCancelInvitation, useResendInvitation } from '@/hooks/use-family';
import { useActiveAlerts, useResolveAlert } from '@/hooks/use-emergency';
import { useTimeline, useCreateTimelineEntry } from '@/hooks/use-timeline';
import { useUpcomingAppointments, useCreateAppointment } from '@/hooks/use-appointments';
import { useQuery } from '@tanstack/react-query';
import { careRecipientsApi, CareRecipient } from '@/lib/api';
import { useFamilySpace } from '@/contexts/family-space-context';
import { CareSummaryCard } from '@/components/ai/care-summary-card';
import { AskAiPanel } from '@/components/ai/ask-ai-panel';
import { SmartEntryInput } from '@/components/ai/smart-entry-input';
import type { ParsedTimelineEntry } from '@/lib/api/ai';
import { CreateTimelineEntryInput } from '@/lib/api';

// Quick actions with proper theme colors
const quickActions = [
  { icon: Pill, label: 'Log Medication', action: 'medication', bgClass: 'bg-primary/15', textClass: 'text-primary', comingSoon: false },
  { icon: Calendar, label: 'Add Appointment', action: 'appointment', bgClass: 'bg-secondary/20', textClass: 'text-secondary-foreground', comingSoon: false },
  { icon: MessageCircle, label: 'Post Update', action: 'update', bgClass: 'bg-muted/20', textClass: 'text-muted-foreground', comingSoon: false },
  { icon: Wand2, label: 'Smart Entry', action: 'smart-entry', bgClass: 'bg-emerald-500/15', textClass: 'text-emerald-700', comingSoon: false },
];

const Dashboard = () => {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  // Use centralized family space context for consistent state across all pages
  const {
    families,
    selectedFamilyId,
    selectedCareRecipientId,
    selectedFamily: currentFamily,
    selectedCareRecipient: careRecipientFromUser,
    careRecipients: careRecipientsInFamily,
    setSelectedFamily,
    setSelectedCareRecipient,
    isLoading: familySpaceLoading,
  } = useFamilySpace();

  // Derive IDs for API calls
  const familyId = currentFamily?.id;
  const careRecipientId = careRecipientFromUser?.id;

  // Handle family switch using context
  const handleFamilySwitch = (newFamilyId: string) => {
    setSelectedFamily(newFamilyId);
  };

  // Handle care recipient switch using context
  const handleCareRecipientSwitch = (newCareRecipientId: string) => {
    setSelectedCareRecipient(newCareRecipientId);
  };

  // Redirect to onboarding if user hasn't completed onboarding
  useEffect(() => {
    if (!authLoading && user && !user.onboardingCompleted) {
      router.push('/onboarding');
    }
  }, [authLoading, user, router]);

  // Fetch care recipient details
  const { data: careRecipient, isLoading: careRecipientLoading } = useQuery({
    queryKey: ['careRecipient', careRecipientId],
    queryFn: () => careRecipientsApi.get(careRecipientId!),
    enabled: !!careRecipientId,
  });

  // Fetch family members
  const { data: familyMembers, isLoading: membersLoading } = useFamilyMembers(familyId || '');
  const { data: pendingInvitations } = usePendingInvitations(familyId || '');
  const inviteMember = useInviteMember(familyId || '');
  const cancelInvitation = useCancelInvitation(familyId || '');
  const resendInvitation = useResendInvitation(familyId || '');


  // Fetch active alerts
  const { data: activeAlerts, isLoading: alertsLoading } = useActiveAlerts(careRecipientId || '');

  // Fetch timeline (recent updates)
  const { data: timelineData, isLoading: timelineLoading } = useTimeline(careRecipientId || '', { limit: 5 });
  const createTimelineEntry = useCreateTimelineEntry(careRecipientId || '');

  // Fetch upcoming appointments (as tasks)
  const { data: upcomingAppointments, isLoading: appointmentsLoading } = useUpcomingAppointments(careRecipientId || '', 1);
  const createAppointment = useCreateAppointment(careRecipientId || '');

  // Resolve alert mutation
  const resolveAlert = useResolveAlert(careRecipientId || '');

  // Local state
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Array<{ id: number; message: string; read: boolean }>>([]);

  // Dialog states
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [postUpdateOpen, setPostUpdateOpen] = useState(false);
  const [addCareRecipientOpen, setAddCareRecipientOpen] = useState(false);
  const [editCareRecipientOpen, setEditCareRecipientOpen] = useState(false);
  const [askAiOpen, setAskAiOpen] = useState(false);
  const [showSmartEntry, setShowSmartEntry] = useState(false);

  // Form states
  const [newTask, setNewTask] = useState({ title: '', time: '', type: 'appointment' });
  const [newMember, setNewMember] = useState({ name: '', email: '', role: 'CAREGIVER' as 'ADMIN' | 'CAREGIVER' | 'VIEWER' });
  const [newUpdate, setNewUpdate] = useState('');

  // Tab state
  const [activeTab, setActiveTab] = useState<'overview' | 'medications' | 'contacts' | 'documents'>('overview');

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Map alerts to display format
  const alertsDisplay = useMemo(() => {
    if (!activeAlerts) return [];
    return activeAlerts.map((alert, index) => ({
      id: index,
      type: 'emergency' as const,
      title: `${alert.type} Alert`,
      message: alert.description || 'Emergency alert triggered',
      time: new Date(alert.createdAt).toLocaleString(),
      actionRequired: alert.status === 'ACTIVE',
      alertId: alert.id,
    }));
  }, [activeAlerts]);

  // Map timeline entries to recent updates
  const recentUpdates = useMemo(() => {
    if (!timelineData?.pages) return [];
    const entries = timelineData.pages
      .filter((page): page is any[] => Array.isArray(page))
      .flat();
    return entries
      .filter((entry) => !!entry)
      .slice(0, 5)
      .map((entry: any) => ({
        id: entry.id,
        author: entry.createdBy?.fullName || 'Unknown',
        message: entry.description || entry.title || 'Update',
        time: new Date(entry.createdAt).toLocaleString(),
        type: entry.type === 'MEDICAL_APPOINTMENT' || entry.type === 'VITAL_SIGN' ? 'medical' : 'update',
      }));
  }, [timelineData]);

  // Map appointments to tasks
  const tasks = useMemo(() => {
    if (!upcomingAppointments) return [];
    return upcomingAppointments.map((apt: any) => ({
      id: apt.id,
      title: apt.title,
      time: new Date(apt.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      type: 'appointment',
      completed: apt.status === 'COMPLETED',
    }));
  }, [upcomingAppointments]);

  // Map family members for circle display
  const circleMembers = useMemo(() => {
    const members = (familyMembers || []).map((member) => ({
      id: member.id,
      name: member.user?.fullName || member.user?.email || 'Unknown',
      role: member.role === 'ADMIN' ? 'Family Admin' : member.role === 'CAREGIVER' ? 'Caregiver' : 'Family Member',
      status: 'active' as const,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone.split('/')[1] || 'Local',
    }));

    // Add pending invitations - use invitation ID for stable key
    const pending = (pendingInvitations || []).map((inv) => ({
      id: `pending-${inv.id}`,
      name: inv.email.split('@')[0],
      role: inv.role === 'ADMIN' ? 'Family Admin' : inv.role === 'CAREGIVER' ? 'Caregiver' : 'Family Member',
      status: 'pending' as const,
      timezone: 'Pending',
    }));

    return [...members, ...pending];
  }, [familyMembers, pendingInvitations]);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title || !newTask.time || !careRecipientId) return;

    try {
      const startTime = new Date();
      const [hours, minutes] = newTask.time.split(':');
      startTime.setHours(parseInt(hours), parseInt(minutes));

      await createAppointment.mutateAsync({
        title: newTask.title,
        startTime: startTime.toISOString(),
        endTime: new Date(startTime.getTime() + 60 * 60 * 1000).toISOString(), // 1 hour duration
        type: 'OTHER',
      });
      setNewTask({ title: '', time: '', type: 'appointment' });
      setAddTaskOpen(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMember.email) return;

    // Validate familyId exists before inviting
    if (!familyId) {
      toast.error('No family found. Please create a family first.');
      return;
    }

    try {
      await inviteMember.mutateAsync({
        email: newMember.email,
        role: newMember.role,
        familyId, // Pass familyId explicitly
      });
      setNewMember({ name: '', email: '', role: 'CAREGIVER' });
      setAddMemberOpen(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      await cancelInvitation.mutateAsync(invitationId);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    try {
      await resendInvitation.mutateAsync(invitationId);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handlePostUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUpdate.trim() || !careRecipientId) return;

    try {
      await createTimelineEntry.mutateAsync({
        type: 'NOTE',
        title: 'Care Update',
        description: newUpdate,
      });
      setNewUpdate('');
      setPostUpdateOpen(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleSmartEntryConfirm = (parsed: ParsedTimelineEntry) => {
    if (!careRecipientId) return;

    const entryData: CreateTimelineEntryInput = {
      type: parsed.type,
      title: parsed.title,
      description: parsed.description,
      severity: parsed.severity as any,
    };

    if (parsed.vitals) {
      entryData.vitals = {
        bloodPressure:
          parsed.vitals.bloodPressureSystolic && parsed.vitals.bloodPressureDiastolic
            ? `${parsed.vitals.bloodPressureSystolic}/${parsed.vitals.bloodPressureDiastolic}`
            : undefined,
        heartRate: parsed.vitals.heartRate,
        temperature: parsed.vitals.temperature,
        oxygenLevel: parsed.vitals.oxygenLevel,
        bloodSugar: parsed.vitals.bloodSugar,
      };
    }

    createTimelineEntry.mutate(entryData);
    setShowSmartEntry(false);
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'medication':
        setActiveTab('medications');
        break;
      case 'appointment':
        setAddTaskOpen(true);
        break;
      case 'update':
        setPostUpdateOpen(true);
        break;
      case 'smart-entry':
        setShowSmartEntry(true);
        break;
    }
  };

  const handleDismissAlert = (alertId: number) => {
    // Just hide from UI for now
    toast.success('Alert dismissed');
  };

  const handleAcknowledgeAlert = async (alertId: number) => {
    const alert = alertsDisplay.find(a => a.id === alertId);
    if (alert?.alertId && familyId) {
      try {
        await resolveAlert.mutateAsync({ alertId: alert.alertId, notes: 'Acknowledged from dashboard' });
      } catch (error) {
        // Error handled by mutation
      }
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const isLoading = authLoading || careRecipientLoading;

  // Calculate care recipient age
  const careRecipientAge = useMemo(() => {
    if (!careRecipient?.dateOfBirth) return null;
    const birth = new Date(careRecipient.dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }, [careRecipient]);

  if (isLoading) {
    return (
      <div className="container max-w-7xl mx-auto px-4 md:px-6">
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-5 w-48" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-11 w-11 rounded-xl" />
              <Skeleton className="h-11 w-11 rounded-xl" />
              <Skeleton className="h-11 w-28 rounded-xl" />
            </div>
          </div>
          <div className="flex gap-1 mb-8">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-10 w-28" />)}
          </div>
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-64 w-full rounded-2xl" />
              <Skeleton className="h-80 w-full rounded-2xl" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-48 w-full rounded-2xl" />
              <Skeleton className="h-64 w-full rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto px-4 md:px-6">
      {/* Emergency Alert Banner */}
      <EmergencyAlertBanner
        alerts={alertsDisplay}
        onDismiss={handleDismissAlert}
        onAcknowledge={handleAcknowledgeAlert}
      />

      {/* Family Space Selector */}
      <FamilySpaceSelector onAddCareRecipient={() => setAddCareRecipientOpen(true)} />

      {/* Welcome Header - Enhanced */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 sm:gap-4 mb-6 sm:mb-8 animate-fade">
        <div className="space-y-0.5 sm:space-y-1 min-w-0">
          <p className="label-caps text-muted-foreground text-[10px] sm:text-xs">Care Dashboard</p>
          <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-foreground tracking-tight truncate">
            {getGreeting()}, {user?.fullName?.split(' ')[0] || 'there'}
          </h1>
          <p className="text-muted-foreground text-sm sm:text-lg truncate">{currentDate}</p>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <div className="relative">
            <Button
              variant="outline"
              size="icon"
              className="relative border-border/60 hover:bg-accent hover:border-border rounded-xl h-11 w-11"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <Bell className="w-5 h-5 text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="notification-badge absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive rounded-full border-2 border-background text-[10px] flex items-center justify-center text-destructive-foreground font-semibold">
                  {unreadCount}
                </span>
              )}
            </Button>

            {showNotifications && (
              <div className="absolute right-0 top-14 w-80 md:w-96 bg-card border border-border rounded-2xl shadow-xl z-50 p-5 animate-fade">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-serif text-lg text-foreground">Notifications</h3>
                  <button
                    onClick={markAllRead}
                    className="text-sm text-primary hover:text-primary/80 font-medium"
                  >
                    Mark all read
                  </button>
                </div>
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No notifications</p>
                  ) : (
                    notifications.map(n => (
                      <div
                        key={n.id}
                        className={`p-4 rounded-xl text-sm transition-colors ${
                          n.read
                            ? 'bg-muted/10 text-muted-foreground'
                            : n.message.includes('Emergency')
                              ? 'bg-destructive/10 border border-destructive/20 text-foreground font-medium'
                              : 'bg-primary/10 text-foreground'
                        }`}
                      >
                        {n.message}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {careRecipientId && (
            <Button
              variant="outline"
              size="icon"
              className="border-sage/30 hover:bg-sage/10 hover:border-sage/50 rounded-xl h-11 w-11"
              onClick={() => setAskAiOpen(true)}
              title="Ask CareCircle AI"
            >
              <Sparkles className="w-5 h-5 text-sage" />
            </Button>
          )}

          <Link href="/settings">
            <Button variant="outline" size="icon" className="border-border/60 hover:bg-accent hover:border-border rounded-xl h-11 w-11">
              <Settings className="w-5 h-5 text-muted-foreground" />
            </Button>
          </Link>

          <Dialog open={addTaskOpen} onOpenChange={setAddTaskOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl h-11 px-5 shadow-sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Task
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-2xl">
              <DialogHeader>
                <DialogTitle className="font-serif">Add New Task</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddTask} className="space-y-4 mt-4">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-2">Task Title <span style={{ color: '#dc2626' }}>*</span></label>
                  <Input
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    placeholder="Enter task title"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-2">Time <span style={{ color: '#dc2626' }}>*</span></label>
                  <Input
                    type="time"
                    value={newTask.time}
                    onChange={(e) => setNewTask({ ...newTask, time: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={createAppointment.isPending}>
                  {createAppointment.isPending ? 'Adding...' : 'Add Task'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Navigation Tabs - Enhanced */}
      <div className="flex gap-1 mb-6 sm:mb-8 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
        {[
          { id: 'overview', label: 'Overview', icon: Heart },
          { id: 'medications', label: 'Medications', icon: Pill },
          { id: 'contacts', label: 'Contacts', icon: Users },
          { id: 'documents', label: 'Documents', icon: Calendar },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-200 rounded-xl flex-shrink-0 ${
              activeTab === tab.id
                ? 'bg-primary/15 text-primary shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Loved One Card - Enhanced */}
            <div className="dashboard-card loved-one-card animate-fade-delay-1">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
                <div className="flex items-center gap-5">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/30 to-secondary/20 flex items-center justify-center shadow-inner">
                      <Heart className="w-9 h-9 text-primary" />
                    </div>
                    {careRecipientId && (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-card status-pulse" title="Status: Stable" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="label-caps text-muted-foreground">Your Loved One</p>
                    {careRecipientId ? (
                      <>
                        <h2 className="font-serif text-2xl text-foreground">
                          {careRecipient?.fullName || careRecipientFromUser?.fullName || 'Loading...'}
                        </h2>
                        <p className="text-muted-foreground">
                          {careRecipientAge ? `${careRecipientAge} years old` : ''}
                          {careRecipient?.conditions?.length ? ` • ${careRecipient.conditions[0]}` : ''}
                        </p>
                      </>
                    ) : (
                      <>
                        <h2 className="font-serif text-2xl text-foreground">No care recipient yet</h2>
                        <p className="text-muted-foreground">Add someone you care for to get started</p>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {careRecipientId ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditCareRecipientOpen(true)}
                        className="text-muted-foreground hover:text-foreground hover:bg-accent rounded-xl"
                      >
                        <Pencil className="w-4 h-4 mr-1.5" />
                        Edit
                      </Button>
                      <Link href={`/care-recipients/${careRecipientId}`}>
                        <Button variant="outline" size="sm" className="text-primary hover:text-primary hover:bg-primary/10 rounded-xl border-primary/20">
                          View Profile
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </Link>
                    </>
                  ) : familyId ? (
                    <Button
                      onClick={() => setAddCareRecipientOpen(true)}
                      className="rounded-xl"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add Care Recipient
                    </Button>
                  ) : null}
                </div>
              </div>

              {/* Quick Actions - Enhanced */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickAction(action.action)}
                    className={`quick-action-btn flex flex-col items-center gap-3 p-5 rounded-2xl bg-background/60 hover:bg-background transition-all duration-200 border border-border/50 hover:border-primary/30 hover:shadow-md group relative ${action.comingSoon ? 'opacity-75' : ''}`}
                  >
                    {action.comingSoon && (
                      <div className="absolute -top-2 -right-2 z-10">
                        <ComingSoonBadge size="sm" showIcon={false} />
                      </div>
                    )}
                    <div className={`w-12 h-12 rounded-xl ${action.bgClass} flex items-center justify-center transition-transform duration-200 group-hover:scale-110`}>
                      <action.icon className={`w-5 h-5 ${action.textClass}`} />
                    </div>
                    <span className="text-sm font-medium text-foreground">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Today's Schedule - Enhanced */}
            <div className="dashboard-card animate-fade-delay-2">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-serif text-xl text-foreground">Today's Schedule</h2>
                    <p className="text-sm text-muted-foreground">
                      {tasks.filter(t => t.completed).length} of {tasks.length} completed
                    </p>
                  </div>
                </div>
                <Link href="/calendar">
                  <Button variant="ghost" size="sm" className="text-primary hover:text-primary hover:bg-primary/10 rounded-xl">
                    View All
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 bg-accent rounded-full mb-6 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-500"
                  style={{ width: tasks.length > 0 ? `${(tasks.filter(t => t.completed).length / tasks.length) * 100}%` : '0%' }}
                />
              </div>

              <div className="space-y-2">
                {tasks.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No tasks scheduled for today</p>
                    <Button onClick={() => setAddTaskOpen(true)} variant="ghost" className="mt-2 text-primary">
                      <Plus className="w-4 h-4 mr-2" />
                      Add a task
                    </Button>
                  </div>
                ) : (
                  tasks.map((task) => (
                    <div
                      key={task.id}
                      className={`task-item flex items-center gap-4 p-4 rounded-xl border ${
                        task.completed
                          ? 'bg-accent/30 border-transparent opacity-60'
                          : 'bg-background/50 border-border/50 hover:border-primary/20 hover:bg-accent/50'
                      }`}
                    >
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                        task.completed
                          ? 'bg-primary/20'
                          : task.type === 'medication'
                            ? 'bg-secondary/20'
                            : task.type === 'appointment'
                              ? 'bg-muted/20'
                              : 'bg-primary/15'
                      }`}>
                        {task.completed ? (
                          <CheckCircle2 className="w-5 h-5 text-primary" />
                        ) : task.type === 'medication' ? (
                          <Pill className="w-5 h-5 text-secondary-foreground" />
                        ) : task.type === 'appointment' ? (
                          <Calendar className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <Heart className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium truncate ${task.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                          {task.title}
                        </p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {task.time}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Smart Entry (AI) */}
            {showSmartEntry && careRecipientId && (
              <div className="animate-fade-delay-3">
                <SmartEntryInput
                  onConfirm={handleSmartEntryConfirm}
                  onCancel={() => setShowSmartEntry(false)}
                />
              </div>
            )}

            {/* Recent Updates - Enhanced */}
            <div className="dashboard-card animate-fade-delay-3">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-secondary-foreground" />
                  </div>
                  <div>
                    <h2 className="font-serif text-xl text-foreground">Recent Updates</h2>
                    <p className="text-sm text-muted-foreground">From your care circle</p>
                  </div>
                </div>
                <Dialog open={postUpdateOpen} onOpenChange={setPostUpdateOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="rounded-xl shadow-sm">
                      <Plus className="w-4 h-4 mr-1.5" />
                      Post Update
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md rounded-2xl">
                    <DialogHeader>
                      <DialogTitle className="font-serif">Post an Update</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handlePostUpdate} className="space-y-4 mt-4">
                      <div>
                        <label className="text-sm font-medium text-foreground block mb-2">Share with your care circle</label>
                        <Textarea
                          value={newUpdate}
                          onChange={(e) => setNewUpdate(e.target.value)}
                          placeholder="How is your loved one doing today?"
                          rows={4}
                          required
                          className="rounded-xl"
                        />
                        <p className="text-xs text-muted-foreground mt-2">
                          All circle members will be notified of this update
                        </p>
                      </div>
                      <Button type="submit" className="w-full rounded-xl" disabled={createTimelineEntry.isPending}>
                        {createTimelineEntry.isPending ? 'Posting...' : 'Post Update'}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="space-y-3">
                {recentUpdates.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No recent updates</p>
                    <Button onClick={() => setPostUpdateOpen(true)} variant="ghost" className="mt-2 text-primary">
                      <Plus className="w-4 h-4 mr-2" />
                      Post the first update
                    </Button>
                  </div>
                ) : (
                  recentUpdates.map((update, index) => (
                    <div
                      key={update.id}
                      className={`p-4 rounded-xl bg-background/50 border border-border/50 hover:border-primary/20 transition-all hover:shadow-sm ${index === 0 ? 'ring-1 ring-primary/10' : ''}`}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/10 flex items-center justify-center">
                          <span className="text-sm font-semibold text-primary">
                            {update.author.charAt(0)}
                          </span>
                        </div>
                        <div className="flex-1">
                          <span className="font-medium text-foreground">{update.author}</span>
                          <p className="text-xs text-muted-foreground">{update.time}</p>
                        </div>
                        {update.type === 'medical' && (
                          <span className="text-xs bg-secondary/20 text-secondary-foreground px-3 py-1 rounded-full font-medium">
                            Medical
                          </span>
                        )}
                      </div>
                      <p className="text-foreground text-sm pl-13 leading-relaxed">{update.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* AI Care Summary */}
            {careRecipientId && (
              <CareSummaryCard
                careRecipientId={careRecipientId}
                careRecipientName={careRecipient?.preferredName || careRecipient?.fullName}
              />
            )}

            {/* Emergency Contacts */}
            <EmergencyContacts careRecipientId={careRecipientId} />

            {/* Family Timezone Awareness */}
            {familyId && <FamilyTimezones familyId={familyId} />}

            {/* Care Circle Members - Enhanced */}
            <div className="dashboard-card">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
                    <Users className="w-4 h-4 text-primary" />
                  </div>
                  <h2 className="font-serif text-lg text-foreground">Care Circle</h2>
                </div>
                <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-primary hover:text-primary hover:bg-primary/10 rounded-xl">
                      <Plus className="w-4 h-4 mr-1" />
                      Invite
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md rounded-2xl">
                    <DialogHeader>
                      <DialogTitle className="font-serif">Invite to Care Circle</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddMember} className="space-y-4 mt-4">
                      <div>
                        <label className="text-sm font-medium text-foreground block mb-2">Email</label>
                        <Input
                          type="email"
                          value={newMember.email}
                          onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                          placeholder="email@example.com"
                          required
                          className="rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground block mb-2">Role</label>
                        <select
                          value={newMember.role}
                          onChange={(e) => setNewMember({ ...newMember, role: e.target.value as 'ADMIN' | 'CAREGIVER' | 'VIEWER' })}
                          className="w-full h-10 px-3 rounded-xl border border-border bg-background text-foreground"
                        >
                          <option value="CAREGIVER">Caregiver</option>
                          <option value="VIEWER">Family Member (View Only)</option>
                          <option value="ADMIN">Admin (Full Access)</option>
                        </select>
                      </div>
                      <Button type="submit" className="w-full rounded-xl" disabled={inviteMember.isPending}>
                        {inviteMember.isPending ? 'Sending...' : 'Send Invitation'}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Active Members */}
              <div className="space-y-2">
                {(familyMembers || []).length === 0 && (pendingInvitations || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No circle members yet</p>
                ) : (
                  <>
                    {/* Active members */}
                    {(familyMembers || []).map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 p-3 rounded-xl bg-background/50 hover:bg-accent/50 transition-all border border-transparent hover:border-border/50"
                      >
                        <div className="relative">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/25 to-secondary/15 flex items-center justify-center">
                            <span className="text-sm font-semibold text-primary">
                              {(member.user?.fullName || member.user?.email || 'U').split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-card" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground text-sm truncate">
                            {member.user?.fullName || member.user?.email || 'Unknown'}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{member.role === 'ADMIN' ? 'Admin' : member.role === 'CAREGIVER' ? 'Caregiver' : 'Viewer'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>

              {/* Pending Invitations */}
              {(pendingInvitations || []).length > 0 && (
                <div className="mt-4 pt-4 border-t border-border/50">
                  <div className="flex items-center gap-2 mb-3">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Pending Invitations ({pendingInvitations?.length})
                    </span>
                  </div>
                  <div className="space-y-2">
                    {pendingInvitations?.map((invitation) => (
                      <div
                        key={invitation.id}
                        className="flex items-center gap-3 p-3 rounded-xl bg-secondary/10 border border-secondary/20"
                      >
                        <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center">
                          <Mail className="w-4 h-4 text-secondary-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground text-sm truncate">{invitation.email}</p>
                          <p className="text-xs text-muted-foreground">
                            {invitation.role === 'ADMIN' ? 'Admin' : invitation.role === 'CAREGIVER' ? 'Caregiver' : 'Viewer'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleResendInvitation(invitation.id)}
                            disabled={resendInvitation.isPending}
                            className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors"
                            title="Resend invitation"
                          >
                            <RefreshCw className={`w-4 h-4 ${resendInvitation.isPending ? 'animate-spin' : ''}`} />
                          </button>
                          <button
                            onClick={() => handleCancelInvitation(invitation.id)}
                            disabled={cancelInvitation.isPending}
                            className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                            title="Cancel invitation"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'medications' && (
        <div className="max-w-4xl">
          {careRecipientId ? (
            <MedicationTracker careRecipientId={careRecipientId} />
          ) : (
            <div className="dashboard-card text-center py-12">
              <Pill className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <h2 className="font-serif text-xl text-foreground mb-2">Medication Tracker</h2>
              <p className="text-muted-foreground mb-6">Add a care recipient to start tracking medications.</p>
              {familyId && (
                <Button onClick={() => setAddCareRecipientOpen(true)} className="rounded-xl">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Care Recipient
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'contacts' && (
        <div className="max-w-4xl">
          {careRecipientId && familyId ? (
            <ContactsDirectory careRecipientId={careRecipientId} familyId={familyId} />
          ) : (
            <div className="dashboard-card text-center py-12">
              <Users className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <h2 className="font-serif text-xl text-foreground mb-2">Contacts Directory</h2>
              <p className="text-muted-foreground mb-6">Add a care recipient to manage their contacts.</p>
              {familyId && (
                <Button onClick={() => setAddCareRecipientOpen(true)} className="rounded-xl">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Care Recipient
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="max-w-4xl">
          {familyId ? (
            <DocumentsVault familyId={familyId} />
          ) : (
            <div className="dashboard-card text-center py-12">
              <Calendar className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <h2 className="font-serif text-xl text-foreground mb-2">Documents Vault</h2>
              <p className="text-muted-foreground mb-6">Add a care recipient to store and manage their documents.</p>
              {familyId && (
                <Button onClick={() => setAddCareRecipientOpen(true)} className="rounded-xl">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Care Recipient
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Care Recipient Modals */}
      {familyId && (
        <AddCareRecipientModal
          isOpen={addCareRecipientOpen}
          onClose={() => setAddCareRecipientOpen(false)}
          familyId={familyId}
          onSuccess={() => {
            // The modal already shows toast, just close
          }}
        />
      )}

      {careRecipient && (
        <EditCareRecipientModal
          isOpen={editCareRecipientOpen}
          onClose={() => setEditCareRecipientOpen(false)}
          careRecipient={careRecipient}
        />
      )}

      {/* Ask AI Panel */}
      {careRecipientId && (
        <AskAiPanel
          careRecipientId={careRecipientId}
          careRecipientName={careRecipient?.preferredName || careRecipient?.fullName}
          isOpen={askAiOpen}
          onClose={() => setAskAiOpen(false)}
        />
      )}
    </div>
  );
};

export default Dashboard;
