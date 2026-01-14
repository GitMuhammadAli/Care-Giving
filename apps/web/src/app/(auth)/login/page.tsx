'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Eye, EyeOff, Heart } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { ApiError } from '@/lib/api/client';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  // Get return URL from query params for redirect after login
  const returnUrl = searchParams.get('returnUrl');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setUnverifiedEmail('');
    setIsLoading(true);

    try {
      await login(formData);
      // Redirect to returnUrl if provided, otherwise dashboard
      const destination = returnUrl ? decodeURIComponent(returnUrl) : '/dashboard';
      router.replace(destination);
    } catch (err) {
      if (err instanceof ApiError) {
        const errorMsg = err.message || 'Invalid email or password';

        // Check if error is about unverified email
        if (errorMsg.toLowerCase().includes('verify') || errorMsg.toLowerCase().includes('verified')) {
          setUnverifiedEmail(formData.email);
          setError('Please verify your email address before logging in.');
        } else {
          setError(errorMsg);
        }
      } else {
        setError('Invalid email or password');
      }
      setIsLoading(false);
    }
    // Don't set isLoading to false on success - keep showing loading until redirect
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-md mx-auto"
    >
      {/* Logo/Brand */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-sage/20 mb-4">
          <Heart className="w-8 h-8 text-sage" />
        </div>
        <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-2">Welcome Back</h1>
        <p className="text-muted-foreground">Sign in to continue caring together</p>
      </div>

      {/* Form Card */}
      <Card padding="spacious" className="shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20"
            >
              {error}
              {unverifiedEmail && (
                <div className="mt-3 pt-3 border-t border-destructive/20">
                  <Link
                    href={`/verify-email?email=${encodeURIComponent(unverifiedEmail)}`}
                    className="inline-flex items-center gap-2 text-sage hover:text-sage/80 font-medium transition-colors"
                  >
                    Verify Email Now →
                  </Link>
                </div>
              )}
            </motion.div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              inputSize="lg"
              required
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <Link
                href="/forgot-password"
                className="text-sm text-sage hover:text-sage/80 transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                inputSize="lg"
                required
                autoComplete="current-password"
                className="pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <Button type="submit" variant="editorial" size="lg" fullWidth isLoading={isLoading}>
            Sign In
          </Button>
        </form>

        <div className="mt-6 space-y-3 text-center">
          <p className="text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link
              href="/register"
              className="text-sage hover:text-sage/80 font-medium transition-colors"
            >
              Create one
            </Link>
          </p>
          <p className="text-muted-foreground text-sm">
            Need to verify your email?{' '}
            <Link
              href="/verify-email"
              className="text-sage hover:text-sage/80 font-medium transition-colors"
            >
              Click here
            </Link>
          </p>
        </div>
      </Card>

      {/* Trust message */}
      <p className="text-center text-sm text-muted-foreground mt-6">
        Your data is protected with enterprise-grade security
      </p>
    </motion.div>
  );
}
