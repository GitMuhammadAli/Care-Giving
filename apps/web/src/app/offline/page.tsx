'use client';

import { motion } from 'framer-motion';
import { WifiOff, RefreshCw, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function OfflinePage() {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md text-center"
      >
        <div className="mb-8">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-warning-light flex items-center justify-center">
            <WifiOff className="w-12 h-12 text-warning" />
          </div>
          <h1 className="text-2xl font-semibold text-text-primary mb-2">
            You're Offline
          </h1>
          <p className="text-text-secondary">
            Don't worry, emergency information is still available.
          </p>
        </div>

        <Card className="mb-6">
          <div className="p-6">
            <h2 className="font-semibold text-text-primary mb-4">Available Offline:</h2>
            <ul className="text-left space-y-2 text-sm text-text-secondary">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-success" />
                Emergency contact information
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-success" />
                Current medications list
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-success" />
                Allergies and medical conditions
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-success" />
                Doctor contact numbers
              </li>
            </ul>
          </div>
        </Card>

        <div className="space-y-3">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleRetry}
            leftIcon={<RefreshCw className="w-5 h-5" />}
          >
            Try Again
          </Button>
          
          <a href="tel:911" className="block">
            <Button
              variant="emergency"
              size="lg"
              fullWidth
              leftIcon={<Phone className="w-5 h-5" />}
              className="animate-none"
            >
              Call 911
            </Button>
          </a>
        </div>

        <p className="mt-6 text-xs text-text-tertiary">
          Actions taken offline will sync when you reconnect.
        </p>
      </motion.div>
    </div>
  );
}

