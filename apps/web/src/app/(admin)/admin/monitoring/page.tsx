'use client';

import { useState } from 'react';
import {
  useMonitoringDashboard,
  useRealtimeStats,
  useEmailLogs,
  useAuthLogs,
  useCronLogs,
  useCronJobNames,
} from '@/hooks/admin';
import { DataTable } from '@/components/admin';
// Lazy-loaded chart components for better performance
import {
  LazyAreaChart as AreaChart,
  LazyBarChart as BarChart,
  LazyLineChart as LineChart,
  LazyDonutChart as DonutChart,
  // Lightweight components that don't need lazy loading
  Card,
  Title,
  Text,
  Metric,
  Flex,
  Grid,
  Badge,
  TabGroup,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Legend,
} from '@/components/admin/lazy-charts';
import {
  Activity,
  Clock,
  Mail,
  Shield,
  Timer,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Users,
  Zap,
  Play,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EmailLog, AuthLog, CronLog, EmailStatus, AuthEvent, CronStatus } from '@/lib/api/admin';

const timeRanges = [
  { value: 24, label: 'Last 24 hours' },
  { value: 72, label: 'Last 3 days' },
  { value: 168, label: 'Last 7 days' },
  { value: 720, label: 'Last 30 days' },
];

const formatTimestamp = (ts: string) => {
  const date = new Date(ts);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDate = (ts: string) => {
  const date = new Date(ts);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'SENT':
    case 'COMPLETED':
    case 'LOGIN_SUCCESS':
      return 'emerald';
    case 'FAILED':
    case 'LOGIN_FAILED':
    case 'ACCOUNT_LOCKED':
      return 'red';
    case 'PENDING':
    case 'STARTED':
      return 'yellow';
    default:
      return 'gray';
  }
};

export default function AdminMonitoringPage() {
  const [hours, setHours] = useState(24);
  const [emailPage, setEmailPage] = useState(1);
  const [authPage, setAuthPage] = useState(1);
  const [cronPage, setCronPage] = useState(1);
  const [selectedCronJob, setSelectedCronJob] = useState<string>('');

  const { data: dashboard, isLoading, refetch } = useMonitoringDashboard(hours);
  const { data: realtime } = useRealtimeStats();
  const { data: cronJobs } = useCronJobNames();
  const { data: emailLogs } = useEmailLogs({ page: emailPage, limit: 10 });
  const { data: authLogs } = useAuthLogs({ page: authPage, limit: 10 });
  const { data: cronLogs } = useCronLogs({ 
    page: cronPage, 
    limit: 10,
    jobName: selectedCronJob || undefined,
  });

  // Transform time series data for Tremor charts
  const requestChartData = dashboard?.requests?.data?.map((point) => ({
    time: formatTimestamp(point.timestamp),
    Requests: point.value,
  })) || [];

  const errorChartData = dashboard?.errors?.data?.map((point) => ({
    time: formatTimestamp(point.timestamp),
    Errors: point.value,
  })) || [];

  const responseTimeChartData = dashboard?.responseTimes?.timeSeries?.map((point) => ({
    time: formatTimestamp(point.timestamp),
    'Avg Response Time (ms)': point.value,
  })) || [];

  // Auth chart data
  const authSuccessData = dashboard?.auth?.byEvent 
    ? Object.entries(dashboard.auth.byEvent).map(([event, count]) => ({
        name: event.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
        value: count as number,
      }))
    : [];

  // Email table columns
  const emailColumns = [
    {
      key: 'status',
      header: 'Status',
      render: (log: EmailLog) => (
        <Badge color={getStatusColor(log.status)}>{log.status}</Badge>
      ),
      className: 'w-24',
    },
    {
      key: 'to',
      header: 'To',
      render: (log: EmailLog) => (
        <span className="text-sm font-mono truncate max-w-[150px] block">{log.to}</span>
      ),
    },
    {
      key: 'subject',
      header: 'Subject',
      render: (log: EmailLog) => (
        <span className="text-sm truncate max-w-[200px] block">{log.subject}</span>
      ),
    },
    {
      key: 'template',
      header: 'Template',
      render: (log: EmailLog) => (
        <span className="text-sm text-muted-foreground">{log.template || '-'}</span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Time',
      render: (log: EmailLog) => (
        <span className="text-sm text-muted-foreground">{formatDate(log.createdAt)}</span>
      ),
    },
  ];

  // Auth table columns
  const authColumns = [
    {
      key: 'event',
      header: 'Event',
      render: (log: AuthLog) => (
        <Badge color={getStatusColor(log.event)}>
          {log.event.replace(/_/g, ' ')}
        </Badge>
      ),
      className: 'w-40',
    },
    {
      key: 'email',
      header: 'Email',
      render: (log: AuthLog) => (
        <span className="text-sm font-mono truncate max-w-[200px] block">{log.email}</span>
      ),
    },
    {
      key: 'ipAddress',
      header: 'IP Address',
      render: (log: AuthLog) => (
        <span className="text-sm text-muted-foreground">{log.ipAddress || '-'}</span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Time',
      render: (log: AuthLog) => (
        <span className="text-sm text-muted-foreground">{formatDate(log.createdAt)}</span>
      ),
    },
  ];

  // Cron table columns
  const cronColumns = [
    {
      key: 'status',
      header: 'Status',
      render: (log: CronLog) => (
        <Badge color={getStatusColor(log.status)}>{log.status}</Badge>
      ),
      className: 'w-28',
    },
    {
      key: 'jobName',
      header: 'Job',
      render: (log: CronLog) => (
        <span className="text-sm font-mono">{log.jobName}</span>
      ),
    },
    {
      key: 'duration',
      header: 'Duration',
      render: (log: CronLog) => (
        <span className="text-sm text-muted-foreground">
          {log.duration ? `${log.duration}ms` : '-'}
        </span>
      ),
    },
    {
      key: 'itemsProcessed',
      header: 'Items',
      render: (log: CronLog) => (
        <span className="text-sm">{log.itemsProcessed ?? '-'}</span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Time',
      render: (log: CronLog) => (
        <span className="text-sm text-muted-foreground">{formatDate(log.createdAt)}</span>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sage" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-editorial text-3xl text-foreground">System Monitoring</h1>
          <p className="text-muted-foreground mt-1">
            Real-time metrics, logs, and performance insights
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
            className="px-4 py-2 bg-sage-50 border border-sage-200 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-sage"
          >
            {timeRanges.map((range) => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 border border-sage-200 text-sage-700 rounded-xl hover:bg-sage-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Real-time Stats Bar */}
      {realtime && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card decoration="top" decorationColor="emerald" className="p-4">
            <Flex>
              <div>
                <Text>Requests/min</Text>
                <Metric>{realtime.requestsLastMinute}</Metric>
              </div>
              <Activity className="w-8 h-8 text-emerald-500" />
            </Flex>
          </Card>
          <Card decoration="top" decorationColor="red" className="p-4">
            <Flex>
              <div>
                <Text>Errors/min</Text>
                <Metric>{realtime.errorsLastMinute}</Metric>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </Flex>
          </Card>
          <Card decoration="top" decorationColor="blue" className="p-4">
            <Flex>
              <div>
                <Text>Active Users</Text>
                <Metric>{realtime.activeUsers}</Metric>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </Flex>
          </Card>
          <Card decoration="top" decorationColor="amber" className="p-4">
            <Flex>
              <div>
                <Text>Avg Response</Text>
                <Metric>{realtime.avgResponseTime}ms</Metric>
              </div>
              <Timer className="w-8 h-8 text-amber-500" />
            </Flex>
          </Card>
          <Card decoration="top" decorationColor="violet" className="p-4">
            <Flex>
              <div>
                <Text>Emails Today</Text>
                <Metric>{realtime.emailsSentToday}</Metric>
              </div>
              <Mail className="w-8 h-8 text-violet-500" />
            </Flex>
          </Card>
          <Card decoration="top" decorationColor="cyan" className="p-4">
            <Flex>
              <div>
                <Text>Cron Running</Text>
                <Metric>{realtime.cronJobsRunning}</Metric>
              </div>
              <Play className="w-8 h-8 text-cyan-500" />
            </Flex>
          </Card>
        </div>
      )}

      {/* Main Charts */}
      <TabGroup>
        <TabList variant="solid">
          <Tab icon={Activity}>Requests</Tab>
          <Tab icon={Mail}>Emails</Tab>
          <Tab icon={Shield}>Authentication</Tab>
          <Tab icon={Timer}>Cron Jobs</Tab>
        </TabList>
        <TabPanels>
          {/* Requests Tab */}
          <TabPanel>
            <div className="space-y-6 mt-6">
              <Grid numItemsMd={2} className="gap-6">
                <Card>
                  <Title>Request Volume</Title>
                  <Text>Requests over time</Text>
                  <AreaChart
                    className="h-72 mt-4"
                    data={requestChartData}
                    index="time"
                    categories={['Requests']}
                    colors={['emerald']}
                    showLegend={false}
                    showGridLines={false}
                    curveType="monotone"
                  />
                </Card>
                <Card>
                  <Title>Error Rate</Title>
                  <Text>Errors over time</Text>
                  <AreaChart
                    className="h-72 mt-4"
                    data={errorChartData}
                    index="time"
                    categories={['Errors']}
                    colors={['red']}
                    showLegend={false}
                    showGridLines={false}
                    curveType="monotone"
                  />
                </Card>
              </Grid>

              <Grid numItemsMd={2} className="gap-6">
                <Card>
                  <Title>Response Times</Title>
                  <Text>Average response time (ms)</Text>
                  <LineChart
                    className="h-72 mt-4"
                    data={responseTimeChartData}
                    index="time"
                    categories={['Avg Response Time (ms)']}
                    colors={['amber']}
                    showLegend={false}
                    showGridLines={false}
                    curveType="monotone"
                  />
                </Card>
                <Card>
                  <Title>Response Time Percentiles</Title>
                  <Text>Distribution of response times</Text>
                  <div className="mt-6 space-y-4">
                    <Flex>
                      <Text>Average</Text>
                      <Metric>{dashboard?.responseTimes?.avg || 0}ms</Metric>
                    </Flex>
                    <Flex>
                      <Text>P50 (Median)</Text>
                      <Metric>{dashboard?.responseTimes?.p50 || 0}ms</Metric>
                    </Flex>
                    <Flex>
                      <Text>P95</Text>
                      <Metric>{dashboard?.responseTimes?.p95 || 0}ms</Metric>
                    </Flex>
                    <Flex>
                      <Text>P99</Text>
                      <Metric>{dashboard?.responseTimes?.p99 || 0}ms</Metric>
                    </Flex>
                  </div>
                </Card>
              </Grid>
            </div>
          </TabPanel>

          {/* Emails Tab */}
          <TabPanel>
            <div className="space-y-6 mt-6">
              <Grid numItemsMd={3} className="gap-6">
                <Card decoration="top" decorationColor="emerald">
                  <Flex alignItems="start">
                    <div>
                      <Text>Sent</Text>
                      <Metric>{dashboard?.emails?.sent || 0}</Metric>
                    </div>
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  </Flex>
                </Card>
                <Card decoration="top" decorationColor="red">
                  <Flex alignItems="start">
                    <div>
                      <Text>Failed</Text>
                      <Metric>{dashboard?.emails?.failed || 0}</Metric>
                    </div>
                    <XCircle className="w-8 h-8 text-red-500" />
                  </Flex>
                </Card>
                <Card decoration="top" decorationColor="amber">
                  <Flex alignItems="start">
                    <div>
                      <Text>Pending</Text>
                      <Metric>{dashboard?.emails?.pending || 0}</Metric>
                    </div>
                    <Clock className="w-8 h-8 text-amber-500" />
                  </Flex>
                </Card>
              </Grid>

              <Card>
                <Title>Email by Template</Title>
                <div className="mt-4">
                  {dashboard?.emails?.byTemplate && Object.keys(dashboard.emails.byTemplate).length > 0 ? (
                    <BarChart
                      className="h-48"
                      data={Object.entries(dashboard.emails.byTemplate).map(([template, count]) => ({
                        template: template.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                        count: count as number,
                      }))}
                      index="template"
                      categories={['count']}
                      colors={['violet']}
                      showLegend={false}
                    />
                  ) : (
                    <Text className="text-center py-8">No email data available</Text>
                  )}
                </div>
              </Card>

              <Card>
                <Title>Recent Emails</Title>
                <DataTable
                  data={emailLogs?.data || []}
                  columns={emailColumns}
                  pagination={emailLogs?.pagination}
                  onPageChange={setEmailPage}
                  emptyMessage="No email logs found"
                  getRowId={(log) => log.id}
                />
              </Card>
            </div>
          </TabPanel>

          {/* Auth Tab */}
          <TabPanel>
            <div className="space-y-6 mt-6">
              <Grid numItemsMd={4} className="gap-6">
                <Card decoration="top" decorationColor="emerald">
                  <Flex alignItems="start">
                    <div>
                      <Text>Successful Logins</Text>
                      <Metric>{dashboard?.auth?.loginSuccess || 0}</Metric>
                    </div>
                    <TrendingUp className="w-8 h-8 text-emerald-500" />
                  </Flex>
                </Card>
                <Card decoration="top" decorationColor="red">
                  <Flex alignItems="start">
                    <div>
                      <Text>Failed Logins</Text>
                      <Metric>{dashboard?.auth?.loginFailed || 0}</Metric>
                    </div>
                    <TrendingDown className="w-8 h-8 text-red-500" />
                  </Flex>
                </Card>
                <Card decoration="top" decorationColor="blue">
                  <Flex alignItems="start">
                    <div>
                      <Text>Password Resets</Text>
                      <Metric>{dashboard?.auth?.passwordResets || 0}</Metric>
                    </div>
                    <Shield className="w-8 h-8 text-blue-500" />
                  </Flex>
                </Card>
                <Card decoration="top" decorationColor="violet">
                  <Flex alignItems="start">
                    <div>
                      <Text>Registrations</Text>
                      <Metric>{dashboard?.auth?.registrations || 0}</Metric>
                    </div>
                    <Users className="w-8 h-8 text-violet-500" />
                  </Flex>
                </Card>
              </Grid>

              <Grid numItemsMd={2} className="gap-6">
                <Card>
                  <Title>Auth Events Distribution</Title>
                  {authSuccessData.length > 0 ? (
                    <>
                      <DonutChart
                        className="h-48 mt-4"
                        data={authSuccessData}
                        category="value"
                        index="name"
                        colors={['emerald', 'red', 'blue', 'violet', 'amber', 'cyan', 'pink', 'gray']}
                      />
                      <Legend
                        className="mt-4"
                        categories={authSuccessData.map(d => d.name)}
                        colors={['emerald', 'red', 'blue', 'violet', 'amber', 'cyan', 'pink', 'gray']}
                      />
                    </>
                  ) : (
                    <Text className="text-center py-8">No auth data available</Text>
                  )}
                </Card>
                <Card>
                  <Title>Failed Login Attempts by Email</Title>
                  <Text>Top accounts with failed logins</Text>
                  <div className="mt-4 space-y-3">
                    {dashboard?.auth?.failedLoginsByEmail?.slice(0, 5).map((item) => (
                      <Flex key={item.email}>
                        <Text className="truncate">{item.email}</Text>
                        <Badge color="red">{item.count} attempts</Badge>
                      </Flex>
                    )) || (
                      <Text className="text-center py-4">No failed login attempts</Text>
                    )}
                  </div>
                </Card>
              </Grid>

              <Card>
                <Title>Recent Auth Activity</Title>
                <DataTable
                  data={authLogs?.data || []}
                  columns={authColumns}
                  pagination={authLogs?.pagination}
                  onPageChange={setAuthPage}
                  emptyMessage="No auth logs found"
                  getRowId={(log) => log.id}
                />
              </Card>
            </div>
          </TabPanel>

          {/* Cron Jobs Tab */}
          <TabPanel>
            <div className="space-y-6 mt-6">
              <Grid numItemsMd={4} className="gap-6">
                <Card decoration="top" decorationColor="blue">
                  <Flex alignItems="start">
                    <div>
                      <Text>Total Executions</Text>
                      <Metric>{dashboard?.cron?.total || 0}</Metric>
                    </div>
                    <Zap className="w-8 h-8 text-blue-500" />
                  </Flex>
                </Card>
                <Card decoration="top" decorationColor="emerald">
                  <Flex alignItems="start">
                    <div>
                      <Text>Completed</Text>
                      <Metric>{dashboard?.cron?.completed || 0}</Metric>
                    </div>
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  </Flex>
                </Card>
                <Card decoration="top" decorationColor="red">
                  <Flex alignItems="start">
                    <div>
                      <Text>Failed</Text>
                      <Metric>{dashboard?.cron?.failed || 0}</Metric>
                    </div>
                    <XCircle className="w-8 h-8 text-red-500" />
                  </Flex>
                </Card>
                <Card decoration="top" decorationColor="amber">
                  <Flex alignItems="start">
                    <div>
                      <Text>Avg Duration</Text>
                      <Metric>{dashboard?.cron?.avgDuration || 0}ms</Metric>
                    </div>
                    <Timer className="w-8 h-8 text-amber-500" />
                  </Flex>
                </Card>
              </Grid>

              <Card>
                <Title>Job Performance</Title>
                <Text>Success rate and duration by job</Text>
                <div className="mt-4 space-y-4">
                  {dashboard?.cron?.byJob?.map((job) => (
                    <div key={job.jobName} className="p-4 bg-sage-50 rounded-xl">
                      <Flex>
                        <div>
                          <Text className="font-mono font-medium">{job.jobName}</Text>
                          <Flex className="mt-1 gap-4">
                            <Badge color="emerald">{job.completed} completed</Badge>
                            <Badge color="red">{job.failed} failed</Badge>
                            <Badge color="gray">Avg: {job.avgDuration}ms</Badge>
                          </Flex>
                        </div>
                        <div className="text-right">
                          <Text className="text-sm text-muted-foreground">Success Rate</Text>
                          <Metric className="text-lg">
                            {job.total > 0 
                              ? Math.round((job.completed / job.total) * 100)
                              : 0}%
                          </Metric>
                        </div>
                      </Flex>
                    </div>
                  )) || (
                    <Text className="text-center py-4">No cron job data available</Text>
                  )}
                </div>
              </Card>

              <Card>
                <Flex className="mb-4">
                  <Title>Recent Executions</Title>
                  <select
                    value={selectedCronJob}
                    onChange={(e) => {
                      setSelectedCronJob(e.target.value);
                      setCronPage(1);
                    }}
                    className="px-3 py-1.5 bg-sage-50 border border-sage-200 rounded-lg text-sm"
                  >
                    <option value="">All Jobs</option>
                    {cronJobs?.jobNames?.map((job) => (
                      <option key={job} value={job}>
                        {job}
                      </option>
                    ))}
                  </select>
                </Flex>
                <DataTable
                  data={cronLogs?.data || []}
                  columns={cronColumns}
                  pagination={cronLogs?.pagination}
                  onPageChange={setCronPage}
                  emptyMessage="No cron logs found"
                  getRowId={(log) => log.id}
                />
              </Card>
            </div>
          </TabPanel>
        </TabPanels>
      </TabGroup>
    </div>
  );
}

