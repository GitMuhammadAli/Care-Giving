'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { ApiError } from '@/lib/api/client';
import { useAuth } from '@/hooks/use-auth';
import { AUTH, FORM } from '@/lib/messages';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get('email');
  const returnUrl = searchParams.get('returnUrl');
  const { verifyEmail, resendVerification } = useAuth();

  const [email, setEmail] = useState(emailParam || '');
  const [showOtpInput, setShowOtpInput] = useState(!!emailParam); // Show OTP if email in URL
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const hasSentInitialCode = useRef(false);

  // Auto-send verification code when page loads with email parameter
  useEffect(() => {
    if (emailParam && !hasSentInitialCode.current) {
      hasSentInitialCode.current = true;
      // Small delay to ensure component is mounted
      const timer = setTimeout(async () => {
        setIsResending(true);
        try {
          await resendVerification({ email: emailParam });
          toast.success(AUTH.CODE_SENT);
          setResendCooldown(60);
          setTimeout(() => inputRefs.current[0]?.focus(), 100);
        } catch (err) {
          if (err instanceof ApiError) {
            const errorMsg = err.message || AUTH.CODE_SEND_FAILED;
            setError(errorMsg);
            toast.error(errorMsg);
          } else {
            setError(AUTH.CODE_SEND_FAILED);
            toast.error(AUTH.CODE_SEND_FAILED);
          }
        } finally {
          setIsResending(false);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [emailParam, resendVerification]);

  // Countdown for resend cooldown
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleOtpChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError('');

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits are entered
    if (newOtp.every((digit) => digit !== '') && index === 5) {
      handleVerify(newOtp.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();

    if (/^\d{6}$/.test(pastedData)) {
      const newOtp = pastedData.split('');
      setOtp(newOtp);
      inputRefs.current[5]?.focus();
      handleVerify(pastedData);
    }
  };

  const handleVerify = async (otpValue?: string) => {
    if (!email) return;

    const otpCode = otpValue || otp.join('');
    if (otpCode.length !== 6) {
      setError(AUTH.VERIFY_ENTER_DIGITS);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await verifyEmail({ email, otp: otpCode });
      setSuccess(true);
      toast.success(AUTH.VERIFY_SUCCESS);

      // Redirect to returnUrl if present (e.g., invitation flow), otherwise to onboarding
      setTimeout(() => {
        const destination = returnUrl ? decodeURIComponent(returnUrl) : '/onboarding';
        router.push(destination);
      }, 1500);
    } catch (err) {
      if (err instanceof ApiError) {
        const errorMsg = err.message || AUTH.VERIFY_INVALID_CODE;
        setError(errorMsg);
        toast.error(errorMsg);
      } else {
        setError(AUTH.VERIFY_FAILED);
        toast.error(AUTH.VERIFY_FAILED);
      }
      // Clear OTP on error
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email || resendCooldown > 0) return;

    setIsResending(true);
    setError('');

    try {
      await resendVerification({ email });
      toast.success(AUTH.CODE_SENT);
      setResendCooldown(60); // 60 second cooldown
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err) {
      if (err instanceof ApiError) {
        const errorMsg = err.message || AUTH.CODE_RESEND_FAILED;
        setError(errorMsg);
        toast.error(errorMsg);
      } else {
        setError(AUTH.CODE_RESEND_FAILED);
        toast.error(AUTH.CODE_RESEND_FAILED);
      }
    } finally {
      setIsResending(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-md mx-auto py-8"
    >
      <Link
        href="/login"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to login
      </Link>

      <Card padding="spacious" className="shadow-sm">
        {success ? (
          <div className="text-center py-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-sage/20 mb-4"
            >
              <CheckCircle2 className="w-8 h-8 text-sage" />
            </motion.div>
            <h2 className="font-serif text-2xl text-foreground mb-2">
              Email Verified!
            </h2>
            <p className="text-muted-foreground">
              {returnUrl ? 'Redirecting you back...' : 'Redirecting to get you started...'}
            </p>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-sage/20 mb-4">
                <Mail className="w-8 h-8 text-sage" />
              </div>
              <h1 className="font-serif text-2xl text-foreground mb-2">
                Verify Your Email
              </h1>
              {showOtpInput && email ? (
                <>
                  <p className="text-muted-foreground">
                    {isResending ? 'Sending code to' : 'Enter the code sent to'}
                  </p>
                  <p className="text-foreground font-medium mt-1">{email}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowOtpInput(false);
                      setEmail('');
                      setOtp(['', '', '', '', '', '']);
                      setError('');
                    }}
                    className="text-xs text-sage hover:text-sage/80 mt-2"
                  >
                    Change email
                  </button>
                </>
              ) : (
                <p className="text-muted-foreground">
                  Enter your email address to continue
                </p>
              )}
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20 mb-6"
              >
                {error}
              </motion.div>
            )}

            <div className="space-y-6">
              {/* Email Input - Always shown if not coming from registration */}
              {!showOtpInput && (
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && email) {
                        setShowOtpInput(true);
                        setTimeout(() => inputRefs.current[0]?.focus(), 100);
                      }
                    }}
                    inputSize="lg"
                    required
                    autoComplete="email"
                  />
                </div>
              )}

              {/* OTP Input - Shown when email is provided */}
              {showOtpInput && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-3 text-center">
                    Enter 6-digit code
                  </label>
                  <div className="flex gap-2 justify-center" onPaste={handlePaste}>
                    {otp.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => {
                          inputRefs.current[index] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        className="w-12 h-14 text-center text-2xl font-semibold border-2 border-border rounded-lg focus:border-sage focus:ring-2 focus:ring-sage/20 outline-none transition-colors"
                        disabled={isLoading || success}
                      />
                    ))}
                  </div>
                </div>
              )}

              {!showOtpInput ? (
                <Button
                  type="button"
                  variant="editorial"
                  size="lg"
                  fullWidth
                  onClick={() => {
                    if (!email || !email.includes('@')) {
                      setError(FORM.INVALID_EMAIL);
                      return;
                    }
                    setError('');
                    setShowOtpInput(true);
                    setTimeout(() => inputRefs.current[0]?.focus(), 100);
                  }}
                  disabled={!email}
                >
                  Continue
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="editorial"
                    size="lg"
                    fullWidth
                    onClick={() => handleVerify()}
                    isLoading={isLoading}
                    disabled={!email || otp.some((digit) => !digit) || success}
                  >
                    Verify Email
                  </Button>

                  <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Don&apos;t have a code yet?
                    </p>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!email) return;
                        setError('');
                        setIsResending(true);
                        setOtp(['', '', '', '', '', '']);
                        try {
                          await resendVerification({ email });
                          toast.success(AUTH.CODE_SENT);
                          setResendCooldown(60);
                          setTimeout(() => inputRefs.current[0]?.focus(), 100);
                        } catch (err) {
                          if (err instanceof ApiError) {
                            const errorMsg = err.message || AUTH.CODE_SEND_FAILED;
                            setError(errorMsg);
                            toast.error(errorMsg);
                          } else {
                            setError(AUTH.CODE_SEND_FAILED);
                            toast.error(AUTH.CODE_SEND_FAILED);
                          }
                        } finally {
                          setIsResending(false);
                        }
                      }}
                      disabled={isResending || resendCooldown > 0}
                      className="text-sm text-sage hover:text-sage/80 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isResending
                        ? 'Sending code...'
                        : resendCooldown > 0
                        ? `Resend in ${resendCooldown}s`
                        : 'Send Code to Email'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </Card>

      {showOtpInput && (
        <p className="text-center text-sm text-muted-foreground mt-6">
          The code expires in 5 minutes
        </p>
      )}
    </motion.div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="w-full max-w-md mx-auto flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sage" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
