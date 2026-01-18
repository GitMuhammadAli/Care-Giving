'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { authApi } from '@/lib/api';
import { ApiError } from '@/lib/api/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await authApi.forgotPassword(email);
      setIsSubmitted(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        toast.error(err.message);
      } else {
        // Network or unexpected error - still show success for security
        // (don't let attackers know if the request failed)
        setIsSubmitted(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card padding="spacious" className="shadow-lg text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-success-light flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-success" />
          </div>
          <h1 className="text-2xl font-semibold text-text-primary mb-2">Check your email</h1>
          <p className="text-text-secondary mb-6">
            We've sent password reset instructions to <strong>{email}</strong>
          </p>
          <Link href="/login">
            <Button variant="secondary" size="lg" fullWidth leftIcon={<ArrowLeft className="w-5 h-5" />}>
              Back to Sign In
            </Button>
          </Link>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-semibold text-text-primary">
          Reset your password
        </h1>
        <p className="text-text-secondary mt-2">
          Enter your email and we'll send you reset instructions
        </p>
      </div>

      <Card padding="spacious" className="shadow-lg">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20"
            >
              {error}
            </motion.div>
          )}

          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Mail className="w-5 h-5" />}
            inputSize="lg"
            required
            autoComplete="email"
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            isLoading={isLoading}
          >
            Send Reset Link
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-border-subtle text-center">
          <Link href="/login" className="text-text-link font-medium hover:underline inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </Link>
        </div>
      </Card>
    </motion.div>
  );
}

