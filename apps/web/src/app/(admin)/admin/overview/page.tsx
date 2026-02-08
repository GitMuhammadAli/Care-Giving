'use client';

import { useAdminOverview, useUsageMetrics, useSystemHealth, useResourceUsage } from '@/hooks/admin';
import { StatsCard } from '@/components/admin';
import { 
  Users, 
  Home, 
  Heart, 
  AlertCircle, 
  Calendar, 
  Pill, 
  FileText, 
  Activity,
  Database,
  Server,
  Clock,
  Mail,
  HardDrive,
  Zap,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AdminOverviewPage() {
  const { data: overview, isLoading } = useAdminOverview();
  const { data: usage } = useUsageMetrics();
  const { data: health } = useSystemHealth();
  const { data: resourceUsage } = useResourceUsage();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sage" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="font-editorial text-3xl text-foreground">Dashboard Overview</h1>
        <p className="text-muted-foreground mt-1">
          Monitor your platform's health and activity
        </p>
      </div>

      {/* System Health Banner */}
      {health && (
        <div className={cn(
          'dashboard-card flex items-center gap-4',
          health.status === 'healthy' && 'border-l-4 border-l-sage',
          health.status === 'degraded' && 'border-l-4 border-l-warning',
          health.status === 'unhealthy' && 'border-l-4 border-l-destructive',
        )}>
          <div className={cn(
            'p-3 rounded-xl',
            health.status === 'healthy' && 'bg-sage/10',
            health.status === 'degraded' && 'bg-warning/10',
            health.status === 'unhealthy' && 'bg-destructive/10',
          )}>
            {health.status === 'healthy' && <CheckCircle2 className="w-6 h-6 text-sage" />}
            {health.status === 'degraded' && <AlertTriangle className="w-6 h-6 text-warning" />}
            {health.status === 'unhealthy' && <XCircle className="w-6 h-6 text-destructive" />}
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-foreground">
              System Status: <span className="capitalize">{health.status}</span>
            </h3>
            <p className="text-sm text-muted-foreground">
              Uptime: {Math.floor(health.uptime / 3600)}h {Math.floor((health.uptime % 3600) / 60)}m
              {' · '}Database: {health.database?.latency}
              {' · '}Memory: {health.memory?.heapUsed}
            </p>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <p>v{health.version}</p>
            <p className="capitalize">{health.environment}</p>
          </div>
        </div>
      )}

      {/* User Stats */}
      <div>
        <h2 className="font-editorial text-xl text-foreground mb-4">User Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Users"
            value={overview?.users.total.toLocaleString() || '0'}
            change={overview?.users.growthRate}
            icon={Users}
            iconColor="text-sage"
          />
          <StatsCard
            title="Active Users"
            value={overview?.users.active.toLocaleString() || '0'}
            icon={Activity}
            iconColor="text-sage"
          />
          <StatsCard
            title="New This Week"
            value={overview?.users.newThisWeek.toLocaleString() || '0'}
            icon={Users}
            iconColor="text-terracotta"
          />
          <StatsCard
            title="New Today"
            value={overview?.users.newToday.toLocaleString() || '0'}
            icon={Users}
            iconColor="text-slate"
          />
        </div>
      </div>

      {/* Platform Stats */}
      <div>
        <h2 className="font-editorial text-xl text-foreground mb-4">Platform Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Families"
            value={overview?.families.total.toLocaleString() || '0'}
            icon={Home}
            iconColor="text-sage"
          />
          <StatsCard
            title="Care Recipients"
            value={overview?.careRecipients.total.toLocaleString() || '0'}
            icon={Heart}
            iconColor="text-terracotta"
          />
          <StatsCard
            title="Active Medications"
            value={overview?.careRecipients.activeMedications.toLocaleString() || '0'}
            icon={Pill}
            iconColor="text-slate"
          />
          <StatsCard
            title="Upcoming Appointments"
            value={overview?.careRecipients.upcomingAppointments.toLocaleString() || '0'}
            icon={Calendar}
            iconColor="text-sage"
          />
        </div>
      </div>

      {/* Resource Usage & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Resource Usage */}
        <div className="dashboard-card">
          <h3 className="font-editorial text-lg text-foreground mb-4">Resource Usage</h3>
          <div className="space-y-4">
            {resourceUsage?.usage?.map((resource: any) => (
              <div key={resource.resource} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {resource.resource === 'EMAILS_PER_DAY' && <Mail className="w-4 h-4 text-muted-foreground" />}
                    {resource.resource === 'FILE_UPLOADS_PER_MONTH' && <HardDrive className="w-4 h-4 text-muted-foreground" />}
                    {resource.resource === 'REDIS_COMMANDS_PER_DAY' && <Zap className="w-4 h-4 text-muted-foreground" />}
                    {resource.resource === 'RABBITMQ_MESSAGES_PER_MONTH' && <Server className="w-4 h-4 text-muted-foreground" />}
                    <span className="text-foreground font-medium">
                      {resource.resource.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l: string) => l.toUpperCase())}
                    </span>
                  </div>
                  <span className={cn(
                    'text-xs font-medium px-2 py-0.5 rounded-full',
                    resource.status === 'OK' && 'bg-sage/10 text-sage',
                    resource.status === 'WARNING' && 'bg-warning/10 text-warning',
                    resource.status === 'LIMIT_REACHED' && 'bg-destructive/10 text-destructive',
                  )}>
                    {resource.status}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-sage-100 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        resource.percentUsed < 70 && 'bg-sage',
                        resource.percentUsed >= 70 && resource.percentUsed < 90 && 'bg-warning',
                        resource.percentUsed >= 90 && 'bg-destructive',
                      )}
                      style={{ width: `${Math.min(resource.percentUsed, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-20 text-right">
                    {resource.current.toLocaleString()} / {resource.limit.toLocaleString()}
                  </span>
                </div>
              </div>
            )) || (
              <p className="text-sm text-muted-foreground italic">Loading resource usage...</p>
            )}
          </div>
        </div>

        {/* System Alerts */}
        <div className="dashboard-card">
          <h3 className="font-editorial text-lg text-foreground mb-4">System Alerts</h3>
          <div className="space-y-4">
            {(overview?.careRecipients?.activeEmergencies ?? 0) > 0 ? (
              <div className="flex items-center gap-3 p-4 bg-destructive/5 border border-destructive/20 rounded-xl">
                <AlertCircle className="w-5 h-5 text-destructive" />
                <div>
                  <p className="font-medium text-destructive">
                    {overview?.careRecipients?.activeEmergencies} Active Emergency Alert
                    {(overview?.careRecipients?.activeEmergencies ?? 0) > 1 ? 's' : ''}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Requires immediate attention
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4 bg-sage/5 border border-sage/20 rounded-xl">
                <CheckCircle2 className="w-5 h-5 text-sage" />
                <div>
                  <p className="font-medium text-sage">All Clear</p>
                  <p className="text-sm text-muted-foreground">
                    No active emergency alerts
                  </p>
                </div>
              </div>
            )}
            {(overview?.families?.pendingInvitations ?? 0) > 0 && (
              <div className="flex items-center gap-3 p-4 bg-warning/5 border border-warning/20 rounded-xl">
                <Users className="w-5 h-5 text-warning" />
                <div>
                  <p className="font-medium text-warning">
                    {overview?.families?.pendingInvitations} Pending Invitation
                    {(overview?.families?.pendingInvitations ?? 0) > 1 ? 's' : ''}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Awaiting user response
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Weekly Activity */}
      <div className="dashboard-card">
        <h3 className="font-editorial text-lg text-foreground mb-4">Weekly Activity</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="text-center p-4 bg-sage-50 rounded-xl">
            <FileText className="w-6 h-6 text-sage mx-auto mb-2" />
            <p className="text-2xl font-editorial text-foreground">
              {usage?.weeklyActivity?.timelineEntries || 0}
            </p>
            <p className="text-xs text-muted-foreground">Timeline Entries</p>
          </div>
          <div className="text-center p-4 bg-sage-50 rounded-xl">
            <Pill className="w-6 h-6 text-sage mx-auto mb-2" />
            <p className="text-2xl font-editorial text-foreground">
              {usage?.weeklyActivity?.medicationLogs || 0}
            </p>
            <p className="text-xs text-muted-foreground">Medication Logs</p>
          </div>
          <div className="text-center p-4 bg-sage-50 rounded-xl">
            <Calendar className="w-6 h-6 text-sage mx-auto mb-2" />
            <p className="text-2xl font-editorial text-foreground">
              {usage?.weeklyActivity?.appointments || 0}
            </p>
            <p className="text-xs text-muted-foreground">Appointments</p>
          </div>
          <div className="text-center p-4 bg-sage-50 rounded-xl">
            <HardDrive className="w-6 h-6 text-sage mx-auto mb-2" />
            <p className="text-2xl font-editorial text-foreground">
              {usage?.weeklyActivity?.documents || 0}
            </p>
            <p className="text-xs text-muted-foreground">Documents</p>
          </div>
          <div className="text-center p-4 bg-sage-50 rounded-xl">
            <AlertCircle className="w-6 h-6 text-sage mx-auto mb-2" />
            <p className="text-2xl font-editorial text-foreground">
              {usage?.weeklyActivity?.emergencyAlerts || 0}
            </p>
            <p className="text-xs text-muted-foreground">Alerts</p>
          </div>
          <div className="text-center p-4 bg-sage-50 rounded-xl">
            <Clock className="w-6 h-6 text-sage mx-auto mb-2" />
            <p className="text-2xl font-editorial text-foreground">
              {usage?.weeklyActivity?.shifts || 0}
            </p>
            <p className="text-xs text-muted-foreground">Shifts</p>
          </div>
        </div>
        
        {/* Medication Adherence */}
        {usage?.medicationAdherence && (
          <div className="mt-6 pt-6 border-t border-sage-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Medication Adherence Rate</span>
              <span className="text-lg font-editorial text-sage">
                {usage.medicationAdherence.rate}%
              </span>
            </div>
            <div className="h-3 bg-sage-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-sage rounded-full transition-all"
                style={{ width: `${usage.medicationAdherence.rate}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
