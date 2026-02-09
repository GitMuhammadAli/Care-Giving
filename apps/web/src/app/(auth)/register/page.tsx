'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Eye, EyeOff, Heart, Check } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { ApiError } from '@/lib/api/client';
import { AUTH } from '@/lib/messages';

/**
 * UNIQUE "Growth Journey" Register Animation
 * - Staggered benefit reveals
 * - Growing strength indicator
 * - Celebration on valid password
 */

const benefits = [
  'Coordinate care with your family circle',
  'Share updates and photos securely',
  'Track medications and appointments',
  'Access 24/7 caregiver support',
];

// Unique container animation
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.15,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, filter: 'blur(4px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 24,
    },
  },
};

// Benefit item animation
const benefitVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 24,
      delay: 0.3 + i * 0.1,
    },
  }),
};

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register } = useAuth();

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
      setError(AUTH.PASSWORD_REQUIREMENTS);
      toast.error(AUTH.PASSWORD_REQUIREMENTS);
      return;
    }

    if (!agreed) {
      setError(AUTH.ACCEPT_TERMS);
      toast.error(AUTH.ACCEPT_TERMS);
      return;
    }

    setIsLoading(true);

    try {
      const response = await register({
        fullName: `${formData.firstName} ${formData.lastName}`.trim(),
        email: formData.email,
        password: formData.password,
      });
      toast.success(AUTH.REGISTER_SUCCESS);
      const verifyUrl = returnUrl
        ? `/verify-email?email=${encodeURIComponent(formData.email)}&returnUrl=${encodeURIComponent(returnUrl)}`
        : `/verify-email?email=${encodeURIComponent(formData.email)}`;
      router.push(verifyUrl);
    } catch (err) {
      if (err instanceof ApiError) {
        const errorMsg = err.message || AUTH.REGISTER_FAILED;
        setError(errorMsg);
        toast.error(errorMsg);
      } else {
        setError(AUTH.REGISTER_FAILED);
        toast.error(AUTH.REGISTER_FAILED);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full"
    >
      <div className="py-8 md:py-16">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
            {/* Left: Benefits with staggered animation */}
            <motion.div
              className="hidden md:block"
              variants={itemVariants}
            >
              <motion.span
                className="inline-block label-caps text-sage mb-4"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.3 }}
              >
                Join Our Community
              </motion.span>
              
              <motion.h1
                className="font-serif text-4xl lg:text-5xl text-foreground mb-6 leading-tight"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.4 }}
              >
                Start your caregiving journey today
              </motion.h1>
              
              <motion.p
                className="text-lg text-muted-foreground mb-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35, duration: 0.3 }}
              >
                Join thousands of families who trust CareCircle to coordinate care for their loved
                ones with compassion and ease.
              </motion.p>

              <ul className="space-y-4">
                {benefits.map((benefit, index) => (
                  <motion.li
                    key={index}
                    className="flex items-start gap-3"
                    custom={index}
                    variants={benefitVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <motion.div
                      className="flex-shrink-0 w-6 h-6 rounded-full bg-sage/20 flex items-center justify-center mt-0.5"
                      whileHover={{ scale: 1.1, backgroundColor: 'rgba(139, 154, 126, 0.3)' }}
                    >
                      <Check className="w-4 h-4 text-sage" />
                    </motion.div>
                    <span className="text-foreground">{benefit}</span>
                  </motion.li>
                ))}
              </ul>

              <motion.div
                className="mt-10 p-6 bg-terracotta/10 rounded-xl border border-border relative overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.4 }}
              >
                {/* Subtle shine effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
                  initial={{ x: '-100%' }}
                  animate={{ x: '200%' }}
                  transition={{ duration: 2, delay: 1.2, ease: 'easeOut' }}
                />
                <p className="text-muted-foreground italic relative">
                  &ldquo;CareCircle brought our family together during a difficult time. We
                  couldn&apos;t have managed without it.&rdquo;
                </p>
                <p className="text-sm text-foreground mt-3 font-medium relative">— Sarah M., Family Caregiver</p>
              </motion.div>
            </motion.div>

            {/* Right: Form */}
            <motion.div 
              className="w-full max-w-md mx-auto md:mx-0"
              variants={itemVariants}
            >
              {/* Mobile header */}
              <motion.div
                className="text-center md:text-left mb-8 md:hidden"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.3 }}
              >
                <motion.div
                  className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-sage/20 mb-4 relative"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.2 }}
                >
                  <motion.div
                    className="absolute inset-0 rounded-full bg-sage/10"
                    animate={{
                      scale: [1, 1.4, 1.4],
                      opacity: [0.5, 0, 0],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      repeatDelay: 3,
                    }}
                  />
                  <Heart className="w-8 h-8 text-sage" />
                </motion.div>
                <h1 className="font-serif text-3xl text-foreground mb-2">Create Account</h1>
                <p className="text-muted-foreground">Start caring together today</p>
              </motion.div>

              <Card padding="spacious" className="shadow-sm">
                <motion.h2
                  className="font-serif text-2xl text-foreground mb-6 hidden md:block"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.3 }}
                >
                  Create your account
                </motion.h2>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <AnimatePresence mode="wait">
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, scale: 0.95 }}
                        animate={{ opacity: 1, height: 'auto', scale: 1 }}
                        exit={{ opacity: 0, height: 0, scale: 0.95 }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                        className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20 origin-top"
                      >
                        {error}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.div
                    className="grid grid-cols-2 gap-4"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.35, duration: 0.3 }}
                  >
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-sm font-medium">
                        First Name <span className="text-destructive">*</span>
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
                        Last Name <span className="text-destructive">*</span>
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
                  </motion.div>

                  <motion.div
                    className="space-y-2"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4, duration: 0.3 }}
                  >
                    <Label htmlFor="email" className="text-sm font-medium">
                      Email Address <span className="text-destructive">*</span>
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
                  </motion.div>

                  <motion.div
                    className="space-y-2"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.45, duration: 0.3 }}
                  >
                    <Label htmlFor="password" className="text-sm font-medium">
                      Password <span className="text-destructive">*</span>
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

                    {/* Password Strength with unique animation */}
                    <AnimatePresence>
                      {formData.password && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25 }}
                          className="mt-3 overflow-hidden"
                        >
                          {/* Animated strength bar */}
                          <div className="flex gap-1 mb-3">
                            {[1, 2, 3, 4].map((level) => (
                              <motion.div
                                key={level}
                                className="h-1.5 flex-1 rounded-full bg-accent"
                                initial={{ scaleX: 0 }}
                                animate={{
                                  scaleX: passwordStrength.score >= level ? 1 : 0.3,
                                  backgroundColor:
                                    passwordStrength.score >= level
                                      ? passwordStrength.score <= 2
                                        ? 'hsl(var(--destructive))'
                                        : passwordStrength.score === 3
                                        ? 'hsl(var(--terracotta))'
                                        : 'hsl(var(--sage))'
                                      : 'hsl(var(--accent))',
                                }}
                                transition={{ duration: 0.3, delay: level * 0.05 }}
                                style={{ originX: 0 }}
                              />
                            ))}
                          </div>

                          {/* Password Requirements */}
                          <div className="space-y-1.5">
                            {[
                              { check: passwordStrength.checks.length, label: 'At least 12 characters' },
                              { check: passwordStrength.checks.lowercase, label: 'One lowercase letter' },
                              { check: passwordStrength.checks.uppercase, label: 'One uppercase letter' },
                              { check: passwordStrength.checks.number, label: 'One digit (0-9)' },
                            ].map((item, index) => (
                              <motion.div
                                key={index}
                                className="flex items-center gap-2"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05, duration: 0.2 }}
                              >
                                <motion.div
                                  animate={{
                                    scale: item.check ? [1, 1.2, 1] : 1,
                                    color: item.check ? 'hsl(var(--sage))' : 'hsl(var(--muted-foreground) / 0.4)',
                                  }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <Check className="w-4 h-4" />
                                </motion.div>
                                <span
                                  className={cn(
                                    'text-xs transition-colors duration-200',
                                    item.check ? 'text-foreground' : 'text-muted-foreground'
                                  )}
                                >
                                  {item.label}
                                </span>
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>

                  <motion.div
                    className="flex items-start gap-3"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.3 }}
                  >
                    <input
                      id="terms"
                      type="checkbox"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-border text-sage focus:ring-sage cursor-pointer"
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
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.55, duration: 0.3 }}
                  >
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
                  </motion.div>
                </form>

                <motion.div
                  className="mt-6 text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6, duration: 0.3 }}
                >
                  <p className="text-muted-foreground">
                    Already have an account?{' '}
                    <Link
                      href="/login"
                      className="text-sage hover:text-sage/80 font-medium transition-colors"
                    >
                      Sign in
                    </Link>
                  </p>
                </motion.div>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="w-full flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sage" />
      </div>
    }>
      <RegisterContent />
    </Suspense>
  );
}
