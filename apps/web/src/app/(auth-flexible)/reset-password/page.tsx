'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Eye, EyeOff, Lock, CheckCircle2, XCircle, ArrowLeft, Shield, Loader2 } from 'lucide-react';
import { authApi } from '@/lib/api';
import { ApiError } from '@/lib/api/client';
import { useAuth } from '@/hooks/use-auth';
import { AUTH } from '@/lib/messages';

type TokenStatus = 'verifying' | 'valid' | 'invalid' | 'missing';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { clearAuth, isAuthenticated } = useAuth();

  // Token verification state
  const [tokenStatus, setTokenStatus] = useState<TokenStatus>(token ? 'verifying' : 'missing');
  const [maskedEmail, setMaskedEmail] = useState<string>('');
  const [tokenError, setTokenError] = useState<string>('');

  // Form state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });

  // Password validation states
  const [passwordValidation, setPasswordValidation] = useState({
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecial: false,
  });

  // Verify token on mount
  useEffect(() => {
    if (!token) {
      setTokenStatus('missing');
      return;
    }

    const verifyToken = async () => {
      try {
        const result = await authApi.verifyResetToken(token);
        if (result.valid) {
          setTokenStatus('valid');
          setMaskedEmail(result.email);
        } else {
          setTokenStatus('invalid');
          setTokenError('This reset link is invalid.');
        }
      } catch (err) {
        setTokenStatus('invalid');
        if (err instanceof ApiError) {
          setTokenError(err.message || AUTH.RESET_TOKEN_INVALID);
        } else {
          setTokenError(AUTH.RESET_TOKEN_INVALID);
        }
      }
    };

    verifyToken();
  }, [token]);

  // Validate password as user types
  useEffect(() => {
    const password = formData.password;
    setPasswordValidation({
      minLength: password.length >= 12,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    });
  }, [formData.password]);

  const isPasswordValid =
    passwordValidation.minLength &&
    passwordValidation.hasUppercase &&
    passwordValidation.hasLowercase &&
    passwordValidation.hasNumber;

  const passwordsMatch =
    formData.password === formData.confirmPassword && formData.confirmPassword.length > 0;

  // Loading state - verifying token
  if (tokenStatus === 'verifying') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md mx-auto"
      >
        <Card padding="spacious" className="shadow-lg text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-sage/10 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-sage animate-spin" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground mb-2">Verifying Link</h1>
          <p className="text-muted-foreground">
            Please wait while we verify your reset link...
          </p>
        </Card>
      </motion.div>
    );
  }

  // Invalid or missing token
  if (tokenStatus === 'invalid' || tokenStatus === 'missing') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md mx-auto"
      >
        <Card padding="spacious" className="shadow-lg text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-destructive/10 flex items-center justify-center">
            <XCircle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground mb-2">Invalid Reset Link</h1>
          <p className="text-muted-foreground mb-6">
            {tokenError || 'This password reset link is invalid or has expired. Please request a new one.'}
          </p>
          <Link href="/forgot-password">
            <Button variant="primary" size="lg" fullWidth>
              Request New Link
            </Button>
          </Link>
          <div className="mt-4">
            <Link href="/login" className="text-sage hover:text-sage/80 font-medium inline-flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Sign In
            </Link>
          </div>
        </Card>
      </motion.div>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md mx-auto"
      >
        <Card padding="spacious" className="shadow-lg text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground mb-2">Password Reset Successful!</h1>
          <p className="text-muted-foreground mb-6">
            Your password has been successfully reset. You can now sign in with your new password.
          </p>
          <Link href="/login">
            <Button variant="primary" size="lg" fullWidth>
              Sign In Now
            </Button>
          </Link>
        </Card>
      </motion.div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError(AUTH.RESET_TOKEN_MISSING);
      return;
    }

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError(AUTH.PASSWORDS_NO_MATCH);
      toast.error(AUTH.PASSWORDS_NO_MATCH);
      return;
    }

    // Validate password strength
    if (!isPasswordValid) {
      setError(AUTH.PASSWORD_WEAK);
      toast.error(AUTH.PASSWORD_WEAK);
      return;
    }

    setIsLoading(true);

    try {
      await authApi.resetPassword(token, formData.password);
      // Clear frontend auth state since backend invalidated all sessions
      if (isAuthenticated) {
        clearAuth();
      }
      setIsSuccess(true);
      toast.success(AUTH.RESET_SUCCESS);
    } catch (err) {
      if (err instanceof ApiError) {
        const errorMsg = err.message || AUTH.RESET_FAILED;
        setError(errorMsg);
        toast.error(errorMsg);
      } else {
        setError(AUTH.RESET_FAILED);
        toast.error(AUTH.RESET_FAILED);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const ValidationItem = ({ valid, text }: { valid: boolean; text: string }) => (
    <div className={`flex items-center gap-2 text-sm ${valid ? 'text-green-600' : 'text-muted-foreground'}`}>
      {valid ? (
        <CheckCircle2 className="w-4 h-4" />
      ) : (
        <div className="w-4 h-4 rounded-full border-2 border-current" />
      )}
      {text}
    </div>
  );

  // Valid token - show reset form
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-md mx-auto"
    >
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-sage/20 mb-4">
          <Shield className="w-8 h-8 text-sage" />
        </div>
        <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-2">Reset Password</h1>
        <p className="text-muted-foreground">
          Create a new secure password for <span className="font-medium text-foreground">{maskedEmail}</span>
        </p>
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
            </motion.div>
          )}

          {/* New Password */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              New Password <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter new password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                leftIcon={<Lock className="w-5 h-5" />}
                inputSize="lg"
                required
                autoComplete="new-password"
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

          {/* Password Requirements */}
          {formData.password.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="p-3 rounded-lg bg-muted/50 space-y-1"
            >
              <p className="text-xs font-medium text-muted-foreground mb-2">Password requirements:</p>
              <ValidationItem valid={passwordValidation.minLength} text="At least 12 characters" />
              <ValidationItem valid={passwordValidation.hasUppercase} text="One uppercase letter" />
              <ValidationItem valid={passwordValidation.hasLowercase} text="One lowercase letter" />
              <ValidationItem valid={passwordValidation.hasNumber} text="One number" />
              <ValidationItem valid={passwordValidation.hasSpecial} text="One special character (recommended)" />
            </motion.div>
          )}

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm font-medium">
              Confirm Password <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm new password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                leftIcon={<Lock className="w-5 h-5" />}
                inputSize="lg"
                required
                autoComplete="new-password"
                className="pr-12"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {formData.confirmPassword.length > 0 && (
              <p className={`text-sm ${passwordsMatch ? 'text-green-600' : 'text-destructive'}`}>
                {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
              </p>
            )}
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            isLoading={isLoading}
            disabled={!isPasswordValid || !passwordsMatch}
          >
            Reset Password
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-border text-center">
          <Link href="/login" className="text-sage hover:text-sage/80 font-medium inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </Link>
        </div>
      </Card>

      {/* Security message */}
      <p className="text-center text-sm text-muted-foreground mt-6">
        Your password is encrypted and stored securely
      </p>
    </motion.div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="w-full max-w-md mx-auto">
        <Card padding="spacious" className="shadow-lg text-center">
          <div className="animate-pulse space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-muted" />
            <div className="h-8 bg-muted rounded w-3/4 mx-auto" />
            <div className="h-4 bg-muted rounded w-1/2 mx-auto" />
          </div>
        </Card>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
