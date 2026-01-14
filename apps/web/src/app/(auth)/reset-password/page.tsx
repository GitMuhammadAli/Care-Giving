'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Lock, CheckCircle2, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [token, setToken] = useState('');

  useEffect(() => {
    const tokenParam = searchParams.get('token');
    if (!tokenParam) {
      setError('Invalid or missing reset token');
    } else {
      setToken(tokenParam);
    }
  }, [searchParams]);

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password strength
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to reset password');
      }

      setIsSuccess(true);
      toast({
        title: 'Success',
        description: 'Your password has been reset successfully',
        variant: 'success',
      });

      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. The link may have expired.');
      toast({
        title: 'Error',
        description: err.message || 'Failed to reset password',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Success state
  if (isSuccess) {
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
          <h1 className="text-2xl font-semibold text-text-primary mb-2">
            Password Reset Successful
          </h1>
          <p className="text-text-secondary mb-6">
            Your password has been reset successfully. Redirecting to login...
          </p>
          <Link href="/login">
            <Button variant="primary" size="lg" fullWidth>
              Go to Login
            </Button>
          </Link>
        </Card>
      </motion.div>
    );
  }

  // Error state (invalid/expired token)
  if (error && !token) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card padding="spacious" className="shadow-lg text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-error-light flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-error" />
          </div>
          <h1 className="text-2xl font-semibold text-text-primary mb-2">Invalid Reset Link</h1>
          <p className="text-text-secondary mb-6">
            This password reset link is invalid or has expired. Please request a new one.
          </p>
          <Link href="/forgot-password">
            <Button variant="primary" size="lg" fullWidth>
              Request New Link
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
          Create New Password
        </h1>
        <p className="text-text-secondary mt-2">
          Enter a strong password for your account
        </p>
      </div>

      <Card padding="spacious" className="shadow-lg">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-4 bg-error-light border border-error rounded-lg">
              <p className="text-sm text-error font-medium">{error}</p>
            </div>
          )}

          <div className="relative">
            <Input
              label="New Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              leftIcon={<Lock className="w-5 h-5" />}
              inputSize="lg"
              required
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-[42px] text-text-tertiary hover:text-text-secondary transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <div className="relative">
            <Input
              label="Confirm Password"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              leftIcon={<Lock className="w-5 h-5" />}
              inputSize="lg"
              required
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-[42px] text-text-tertiary hover:text-text-secondary transition-colors"
            >
              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <div className="bg-bg-muted p-4 rounded-lg">
            <p className="text-sm font-medium text-text-secondary mb-2">Password must contain:</p>
            <ul className="text-sm text-text-tertiary space-y-1">
              <li className={newPassword.length >= 8 ? 'text-success' : ''}>
                • At least 8 characters
              </li>
              <li className={/[A-Z]/.test(newPassword) ? 'text-success' : ''}>
                • One uppercase letter
              </li>
              <li className={/[a-z]/.test(newPassword) ? 'text-success' : ''}>
                • One lowercase letter
              </li>
              <li className={/[0-9]/.test(newPassword) ? 'text-success' : ''}>• One number</li>
            </ul>
          </div>

          <Button type="submit" variant="primary" size="lg" fullWidth isLoading={isLoading}>
            Reset Password
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-border-subtle text-center">
          <Link
            href="/login"
            className="text-text-link font-medium hover:underline inline-flex items-center gap-2"
          >
            Back to Sign In
          </Link>
        </div>
      </Card>
    </motion.div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
