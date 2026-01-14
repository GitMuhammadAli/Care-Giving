'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error('Failed to send reset email');
      }

      // Always show success to prevent email enumeration
      setIsSubmitted(true);
    } catch (error) {
      console.error('Password reset error:', error);
      // Still show success message for security (prevent email enumeration)
      setIsSubmitted(true);
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

