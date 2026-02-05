'use client';

import dynamic from 'next/dynamic';

// Chart loading skeleton
const ChartSkeleton = ({ height = 'h-72' }: { height?: string }) => (
  <div className={`${height} mt-4 bg-sage-50 animate-pulse rounded-lg flex items-center justify-center`}>
    <div className="text-muted-foreground text-sm">Loading chart...</div>
  </div>
);

// Lazy load heavy Tremor chart components (~200KB each)
export const LazyAreaChart = dynamic(
  () => import('@tremor/react').then((mod) => mod.AreaChart),
  {
    loading: () => <ChartSkeleton />,
    ssr: false,
  }
);

export const LazyBarChart = dynamic(
  () => import('@tremor/react').then((mod) => mod.BarChart),
  {
    loading: () => <ChartSkeleton height="h-48" />,
    ssr: false,
  }
);

export const LazyLineChart = dynamic(
  () => import('@tremor/react').then((mod) => mod.LineChart),
  {
    loading: () => <ChartSkeleton />,
    ssr: false,
  }
);

export const LazyDonutChart = dynamic(
  () => import('@tremor/react').then((mod) => mod.DonutChart),
  {
    loading: () => <ChartSkeleton height="h-64" />,
    ssr: false,
  }
);

// Re-export lighter Tremor components that don't need lazy loading
export {
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
} from '@tremor/react';

