'use client';

import { useState } from 'react';
import { useUserMetrics, useFamilyMetrics, useUsageMetrics } from '@/hooks/admin';
import { StatsCard } from '@/components/admin';
import { Users, Home, Activity, Calendar } from 'lucide-react';

export default function AdminAnalyticsPage() {
  const [days, setDays] = useState(30);

  const { data: userMetrics, isLoading: loadingUsers } = useUserMetrics(days);
  const { data: familyMetrics, isLoading: loadingFamilies } = useFamilyMetrics(days);
  const { data: usageMetrics, isLoading: loadingUsage } = useUsageMetrics();

  const isLoading = loadingUsers || loadingFamilies || loadingUsage;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-slate-400 mt-1">
            Platform metrics and insights
          </p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
        </div>
      ) : (
        <>
          {/* User Metrics */}
          <section>
            <h2 className="text-lg font-semibold text-white mb-4">User Metrics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatsCard
                title="Total Users"
                value={userMetrics?.engagement?.totalUsers || 0}
                icon={Users}
                iconColor="text-blue-400"
              />
              <StatsCard
                title="Active This Week"
                value={userMetrics?.engagement?.activeThisWeek || 0}
                icon={Activity}
                iconColor="text-emerald-400"
              />
            </div>

            {/* Status Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <h3 className="text-md font-semibold text-white mb-4">User Status Distribution</h3>
                <div className="space-y-3">
                  {userMetrics?.statusDistribution?.map((item: any) => (
                    <div key={item.status} className="flex items-center justify-between">
                      <span className="text-slate-300">{item.status}</span>
                      <div className="flex items-center gap-3">
                        <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{
                              width: `${((item.count / (userMetrics?.engagement?.totalUsers || 1)) * 100)}%`,
                            }}
                          />
                        </div>
                        <span className="text-white font-medium w-12 text-right">{item.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <h3 className="text-md font-semibold text-white mb-4">Role Distribution</h3>
                <div className="space-y-3">
                  {userMetrics?.roleDistribution?.map((item: any) => (
                    <div key={item.role} className="flex items-center justify-between">
                      <span className="text-slate-300">{item.role.replace('_', ' ')}</span>
                      <div className="flex items-center gap-3">
                        <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{
                              width: `${((item.count / (userMetrics?.engagement?.totalUsers || 1)) * 100)}%`,
                            }}
                          />
                        </div>
                        <span className="text-white font-medium w-12 text-right">{item.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Family Metrics */}
          <section>
            <h2 className="text-lg font-semibold text-white mb-4">Family Metrics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatsCard
                title="Total Families"
                value={familyMetrics?.totalFamilies || 0}
                icon={Home}
                iconColor="text-teal-400"
              />
              <StatsCard
                title="Avg Care Recipients"
                value={familyMetrics?.averageCareRecipients || 0}
                icon={Users}
                iconColor="text-rose-400"
              />
            </div>

            {/* Family Size Distribution */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h3 className="text-md font-semibold text-white mb-4">Family Size Distribution</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {familyMetrics?.sizeDistribution?.map((item: any) => (
                  <div
                    key={item.size}
                    className="bg-slate-700/30 rounded-lg p-4 text-center"
                  >
                    <p className="text-2xl font-bold text-white">{item.count}</p>
                    <p className="text-sm text-slate-400">{item.size} members</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Usage Metrics */}
          <section>
            <h2 className="text-lg font-semibold text-white mb-4">Feature Usage (This Week)</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-white">
                  {usageMetrics?.weeklyActivity?.timelineEntries || 0}
                </p>
                <p className="text-sm text-slate-400">Timeline Entries</p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-white">
                  {usageMetrics?.weeklyActivity?.medicationLogs || 0}
                </p>
                <p className="text-sm text-slate-400">Medication Logs</p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-white">
                  {usageMetrics?.weeklyActivity?.appointments || 0}
                </p>
                <p className="text-sm text-slate-400">Appointments</p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-white">
                  {usageMetrics?.weeklyActivity?.documents || 0}
                </p>
                <p className="text-sm text-slate-400">Documents</p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-white">
                  {usageMetrics?.weeklyActivity?.emergencyAlerts || 0}
                </p>
                <p className="text-sm text-slate-400">Emergency Alerts</p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-white">
                  {usageMetrics?.weeklyActivity?.shifts || 0}
                </p>
                <p className="text-sm text-slate-400">Shifts</p>
              </div>
            </div>
          </section>

          {/* Medication Adherence */}
          {usageMetrics?.medicationAdherence && (
            <section>
              <h2 className="text-lg font-semibold text-white mb-4">Medication Adherence</h2>
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-slate-300">Overall Adherence Rate</span>
                  <span className="text-2xl font-bold text-emerald-400">
                    {usageMetrics.medicationAdherence.rate}%
                  </span>
                </div>
                <div className="h-4 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${usageMetrics.medicationAdherence.rate}%` }}
                  />
                </div>
                <div className="grid grid-cols-4 gap-4 mt-4">
                  {usageMetrics.medicationAdherence.breakdown?.map((item: any) => (
                    <div key={item.status} className="text-center">
                      <p className="text-xl font-bold text-white">{item.count}</p>
                      <p className="text-sm text-slate-400">{item.status}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

