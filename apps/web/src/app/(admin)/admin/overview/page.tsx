'use client';

import { useAdminOverview, useUsageMetrics } from '@/hooks/admin';
import { StatsCard } from '@/components/admin';
import { Users, Home, Heart, AlertCircle, Calendar, Pill, FileText, Activity } from 'lucide-react';

export default function AdminOverviewPage() {
  const { data: overview, isLoading } = useAdminOverview();
  const { data: usage } = useUsageMetrics();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard Overview</h1>
        <p className="text-slate-400 mt-1">
          Monitor your platform's health and activity
        </p>
      </div>

      {/* User Stats */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">User Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Users"
            value={overview?.users.total.toLocaleString() || '0'}
            change={overview?.users.growthRate}
            icon={Users}
            iconColor="text-blue-400"
          />
          <StatsCard
            title="Active Users"
            value={overview?.users.active.toLocaleString() || '0'}
            icon={Activity}
            iconColor="text-emerald-400"
          />
          <StatsCard
            title="New This Week"
            value={overview?.users.newThisWeek.toLocaleString() || '0'}
            icon={Users}
            iconColor="text-purple-400"
          />
          <StatsCard
            title="New Today"
            value={overview?.users.newToday.toLocaleString() || '0'}
            icon={Users}
            iconColor="text-amber-400"
          />
        </div>
      </div>

      {/* Platform Stats */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Platform Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Families"
            value={overview?.families.total.toLocaleString() || '0'}
            icon={Home}
            iconColor="text-teal-400"
          />
          <StatsCard
            title="Care Recipients"
            value={overview?.careRecipients.total.toLocaleString() || '0'}
            icon={Heart}
            iconColor="text-rose-400"
          />
          <StatsCard
            title="Active Medications"
            value={overview?.careRecipients.activeMedications.toLocaleString() || '0'}
            icon={Pill}
            iconColor="text-indigo-400"
          />
          <StatsCard
            title="Upcoming Appointments"
            value={overview?.careRecipients.upcomingAppointments.toLocaleString() || '0'}
            icon={Calendar}
            iconColor="text-cyan-400"
          />
        </div>
      </div>

      {/* Alerts & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Alerts */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">System Alerts</h3>
          <div className="space-y-4">
            {overview?.careRecipients.activeEmergencies > 0 ? (
              <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <div>
                  <p className="font-medium text-red-400">
                    {overview.careRecipients.activeEmergencies} Active Emergency Alert
                    {overview.careRecipients.activeEmergencies > 1 ? 's' : ''}
                  </p>
                  <p className="text-sm text-slate-400">
                    Requires immediate attention
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                <AlertCircle className="w-5 h-5 text-emerald-400" />
                <div>
                  <p className="font-medium text-emerald-400">All Clear</p>
                  <p className="text-sm text-slate-400">
                    No active emergency alerts
                  </p>
                </div>
              </div>
            )}
            {overview?.families.pendingInvitations > 0 && (
              <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <Users className="w-5 h-5 text-amber-400" />
                <div>
                  <p className="font-medium text-amber-400">
                    {overview.families.pendingInvitations} Pending Invitation
                    {overview.families.pendingInvitations > 1 ? 's' : ''}
                  </p>
                  <p className="text-sm text-slate-400">
                    Awaiting user response
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Weekly Activity */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Weekly Activity</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-slate-400" />
                <span className="text-slate-300">Timeline Entries</span>
              </div>
              <span className="font-semibold text-white">
                {usage?.weeklyActivity?.timelineEntries || 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Pill className="w-5 h-5 text-slate-400" />
                <span className="text-slate-300">Medication Logs</span>
              </div>
              <span className="font-semibold text-white">
                {usage?.weeklyActivity?.medicationLogs || 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-slate-400" />
                <span className="text-slate-300">Appointments Created</span>
              </div>
              <span className="font-semibold text-white">
                {usage?.weeklyActivity?.appointments || 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-slate-400" />
                <span className="text-slate-300">Documents Uploaded</span>
              </div>
              <span className="font-semibold text-white">
                {usage?.weeklyActivity?.documents || 0}
              </span>
            </div>
          </div>
          {usage?.medicationAdherence && (
            <div className="mt-6 pt-4 border-t border-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Medication Adherence Rate</span>
                <span className="text-lg font-semibold text-emerald-400">
                  {usage.medicationAdherence.rate}%
                </span>
              </div>
              <div className="mt-2 h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${usage.medicationAdherence.rate}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

