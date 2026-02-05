import { Spinner } from '@/components/ui/loading-skeleton';

export default function MarketingLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}

