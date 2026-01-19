'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Eye, EyeOff, Heart, Check } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { ApiError } from '@/lib/api/client';

const benefits = [
  'Coordinate care with your family circle',
  'Share updates and photos securely',
  'Track medications and appointments',
  'Access 24/7 caregiver support',
];

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register } = useAuth();

  // Get email and returnUrl from query params (for invitation flow)
  const emailParam = searchParams.get('email');
  const returnUrl = searchParams.get('returnUrl');

  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: emailParam || '',
    password: '',
  });

  // Update email if param changes (e.g., after client-side navigation)
  useEffect(() => {
    if (emailParam && !formData.email) {
      setFormData(prev => ({ ...prev, email: emailParam }));
    }
  }, [emailParam]);

  const passwordStrength = useMemo(() => {
    const { password } = formData;
    const checks = {
      length: password.length >= 12,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
    };
    const score = Object.values(checks).filter(Boolean).length;
    return { checks, score };
  }, [formData.password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (passwordStrength.score < 4) {
      const passwordError = 'Please meet all password requirements';
      setError(passwordError);
      toast.error(passwordError);
      return;
    }

    if (!agreed) {
      const termsError = 'Please agree to the Terms of Service and Privacy Policy';
      setError(termsError);
      toast.error(termsError);
      return;
    }

    setIsLoading(true);

    try {
      const response = await register({
        fullName: `${formData.firstName} ${formData.lastName}`.trim(),
        email: formData.email,
        password: formData.password,
      });
      // Show success toast
      toast.success('Account created! Please check your email to verify your account.');
      // Redirect to email verification page, passing returnUrl if present (for invitation flow)
      const verifyUrl = returnUrl
        ? `/verify-email?email=${encodeURIComponent(formData.email)}&returnUrl=${encodeURIComponent(returnUrl)}`
        : `/verify-email?email=${encodeURIComponent(formData.email)}`;
      router.push(verifyUrl);
    } catch (err) {
      if (err instanceof ApiError) {
        const errorMsg = err.message || 'Failed to create account. Please try again.';
        setError(errorMsg);
        toast.error(errorMsg);
      } else {
        const genericError = 'Failed to create account. Please try again.';
        setError(genericError);
        toast.error(genericError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full"
    >
      <div className="py-8 md:py-16">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
            {/* Left: Benefits */}
            <div className="hidden md:block">
              <span className="inline-block label-caps text-sage mb-4">Join Our Community</span>
              <h1 className="font-serif text-4xl lg:text-5xl text-foreground mb-6 leading-tight">
                Start your caregiving journey today
              </h1>
              <p className="text-lg text-muted-foreground mb-8">
                Join thousands of families who trust CareCircle to coordinate care for their loved
                ones with compassion and ease.
              </p>

              <ul className="space-y-4">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-sage/20 flex items-center justify-center mt-0.5">
                      <Check className="w-4 h-4 text-sage" />
                    </div>
                    <span className="text-foreground">{benefit}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-10 p-6 bg-terracotta/10 rounded-xl border border-border">
                <p className="text-muted-foreground italic">
                  &ldquo;CareCircle brought our family together during a difficult time. We
                  couldn&apos;t have managed without it.&rdquo;
                </p>
                <p className="text-sm text-foreground mt-3 font-medium">— Sarah M., Family Caregiver</p>
              </div>
            </div>

            {/* Right: Form */}
            <div className="w-full max-w-md mx-auto md:mx-0">
              <div className="text-center md:text-left mb-8 md:hidden">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-sage/20 mb-4">
                  <Heart className="w-8 h-8 text-sage" />
                </div>
                <h1 className="font-serif text-3xl text-foreground mb-2">Create Account</h1>
                <p className="text-muted-foreground">Start caring together today</p>
              </div>

              <Card padding="spacious" className="shadow-sm">
                <h2 className="font-serif text-2xl text-foreground mb-6 hidden md:block">
                  Create your account
                </h2>

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

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-sm font-medium">
                        First Name
                      </Label>
                      <Input
                        id="firstName"
                        type="text"
                        placeholder="Jane"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        inputSize="lg"
                        required
                        autoComplete="given-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-sm font-medium">
                        Last Name
                      </Label>
                      <Input
                        id="lastName"
                        type="text"
                        placeholder="Smith"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        inputSize="lg"
                        required
                        autoComplete="family-name"
                      />
                    </div>
                  </div>

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
                    <Label htmlFor="password" className="text-sm font-medium">
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Create a strong password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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

                    {/* Password Strength */}
                    {formData.password && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-3"
                      >
                        {/* Strength Bar */}
                        <div className="flex gap-1 mb-3">
                          {[1, 2, 3, 4].map((level) => (
                            <div
                              key={level}
                              className={cn(
                                'h-1.5 flex-1 rounded-full transition-colors',
                                passwordStrength.score >= level
                                  ? passwordStrength.score <= 2
                                    ? 'bg-destructive'
                                    : passwordStrength.score === 3
                                    ? 'bg-terracotta'
                                    : 'bg-sage'
                                  : 'bg-accent'
                              )}
                            />
                          ))}
                        </div>

                        {/* Password Requirements Checklist */}
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <Check
                              className={cn(
                                'w-4 h-4 transition-colors',
                                passwordStrength.checks.length
                                  ? 'text-sage'
                                  : 'text-muted-foreground/40'
                              )}
                            />
                            <span
                              className={cn(
                                'text-xs transition-colors',
                                passwordStrength.checks.length
                                  ? 'text-foreground'
                                  : 'text-muted-foreground'
                              )}
                            >
                              At least 12 characters
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Check
                              className={cn(
                                'w-4 h-4 transition-colors',
                                passwordStrength.checks.lowercase
                                  ? 'text-sage'
                                  : 'text-muted-foreground/40'
                              )}
                            />
                            <span
                              className={cn(
                                'text-xs transition-colors',
                                passwordStrength.checks.lowercase
                                  ? 'text-foreground'
                                  : 'text-muted-foreground'
                              )}
                            >
                              One lowercase letter
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Check
                              className={cn(
                                'w-4 h-4 transition-colors',
                                passwordStrength.checks.uppercase
                                  ? 'text-sage'
                                  : 'text-muted-foreground/40'
                              )}
                            />
                            <span
                              className={cn(
                                'text-xs transition-colors',
                                passwordStrength.checks.uppercase
                                  ? 'text-foreground'
                                  : 'text-muted-foreground'
                              )}
                            >
                              One uppercase letter
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Check
                              className={cn(
                                'w-4 h-4 transition-colors',
                                passwordStrength.checks.number
                                  ? 'text-sage'
                                  : 'text-muted-foreground/40'
                              )}
                            />
                            <span
                              className={cn(
                                'text-xs transition-colors',
                                passwordStrength.checks.number
                                  ? 'text-foreground'
                                  : 'text-muted-foreground'
                              )}
                            >
                              One digit (0-9)
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  <div className="flex items-start gap-3">
                    <input
                      id="terms"
                      type="checkbox"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-border text-sage focus:ring-sage"
                    />
                    <Label
                      htmlFor="terms"
                      className="text-sm text-muted-foreground leading-relaxed cursor-pointer"
                    >
                      I agree to the{' '}
                      <Link href="/terms" className="text-sage hover:text-sage/80">
                        Terms of Service
                      </Link>{' '}
                      and{' '}
                      <Link href="/privacy" className="text-sage hover:text-sage/80">
                        Privacy Policy
                      </Link>
                    </Label>
                  </div>

                  <Button
                    type="submit"
                    variant="editorial"
                    size="lg"
                    fullWidth
                    isLoading={isLoading}
                    disabled={!agreed}
                  >
                    Create Account
                  </Button>
                </form>

                <div className="mt-6 text-center">
                  <p className="text-muted-foreground">
                    Already have an account?{' '}
                    <Link
                      href="/login"
                      className="text-sage hover:text-sage/80 font-medium transition-colors"
                    >
                      Sign in
                    </Link>
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
