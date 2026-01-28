'use client';

import { useState, useMemo, useEffect } from 'react';
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
import { staggerContainer, fadeUp, slideInLeft, slideInRight, scaleUp } from '@/lib/animations';

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
      toast.success('Account created! Please check your email to verify your account.');
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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="w-full"
    >
      <div className="py-8 md:py-16">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
            {/* Left: Benefits */}
            <motion.div 
              className="hidden md:block"
              variants={staggerContainer}
              initial="hidden"
              animate="show"
            >
              <motion.span 
                className="inline-block label-caps text-sage mb-4"
                variants={slideInLeft}
              >
                Join Our Community
              </motion.span>
              <motion.h1 
                className="font-serif text-4xl lg:text-5xl text-foreground mb-6 leading-tight"
                variants={slideInLeft}
              >
                Start your caregiving journey today
              </motion.h1>
              <motion.p 
                className="text-lg text-muted-foreground mb-8"
                variants={slideInLeft}
              >
                Join thousands of families who trust CareCircle to coordinate care for their loved
                ones with compassion and ease.
              </motion.p>

              <motion.ul className="space-y-4" variants={staggerContainer}>
                {benefits.map((benefit, index) => (
                  <motion.li 
                    key={index} 
                    className="flex items-start gap-3"
                    variants={slideInLeft}
                    whileHover={{ x: 4 }}
                    transition={{ type: 'spring', stiffness: 400 }}
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
              </motion.ul>

              <motion.div 
                className="mt-10 p-6 bg-terracotta/10 rounded-xl border border-border"
                variants={scaleUp}
                whileHover={{ scale: 1.02 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <p className="text-muted-foreground italic">
                  &ldquo;CareCircle brought our family together during a difficult time. We
                  couldn&apos;t have managed without it.&rdquo;
                </p>
                <p className="text-sm text-foreground mt-3 font-medium">— Sarah M., Family Caregiver</p>
              </motion.div>
            </motion.div>

            {/* Right: Form */}
            <motion.div 
              className="w-full max-w-md mx-auto md:mx-0"
              variants={staggerContainer}
              initial="hidden"
              animate="show"
            >
              <motion.div 
                className="text-center md:text-left mb-8 md:hidden"
                variants={fadeUp}
              >
                <motion.div 
                  className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-sage/20 mb-4"
                  whileHover={{ scale: 1.05, rotate: 5 }}
                >
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <Heart className="w-8 h-8 text-sage" />
                  </motion.div>
                </motion.div>
                <h1 className="font-serif text-3xl text-foreground mb-2">Create Account</h1>
                <p className="text-muted-foreground">Start caring together today</p>
              </motion.div>

              <motion.div variants={slideInRight}>
                <Card padding="spacious" className="shadow-sm">
                  <motion.h2 
                    className="font-serif text-2xl text-foreground mb-6 hidden md:block"
                    variants={fadeUp}
                  >
                    Create your account
                  </motion.h2>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <AnimatePresence mode="wait">
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, height: 0, y: -10 }}
                          animate={{ opacity: 1, height: 'auto', y: 0 }}
                          exit={{ opacity: 0, height: 0, y: -10 }}
                          transition={{ duration: 0.3 }}
                          className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20"
                        >
                          {error}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <motion.div 
                      className="grid grid-cols-2 gap-4"
                      variants={fadeUp}
                    >
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
                    </motion.div>

                    <motion.div className="space-y-2" variants={fadeUp}>
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
                    </motion.div>

                    <motion.div className="space-y-2" variants={fadeUp}>
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
                        <motion.button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <AnimatePresence mode="wait">
                            <motion.span
                              key={showPassword ? 'hide' : 'show'}
                              initial={{ opacity: 0, rotate: -90 }}
                              animate={{ opacity: 1, rotate: 0 }}
                              exit={{ opacity: 0, rotate: 90 }}
                              transition={{ duration: 0.15 }}
                            >
                              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </motion.span>
                          </AnimatePresence>
                        </motion.button>
                      </div>

                      {/* Password Strength */}
                      <AnimatePresence>
                        {formData.password && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="mt-3"
                          >
                            {/* Strength Bar */}
                            <div className="flex gap-1 mb-3">
                              {[1, 2, 3, 4].map((level) => (
                                <motion.div
                                  key={level}
                                  className={cn(
                                    'h-1.5 flex-1 rounded-full',
                                    passwordStrength.score >= level
                                      ? passwordStrength.score <= 2
                                        ? 'bg-destructive'
                                        : passwordStrength.score === 3
                                        ? 'bg-terracotta'
                                        : 'bg-sage'
                                      : 'bg-accent'
                                  )}
                                  initial={{ scaleX: 0 }}
                                  animate={{ scaleX: 1 }}
                                  transition={{ delay: level * 0.1, duration: 0.3 }}
                                />
                              ))}
                            </div>

                            {/* Password Requirements Checklist */}
                            <motion.div 
                              className="space-y-1.5"
                              variants={staggerContainer}
                              initial="hidden"
                              animate="show"
                            >
                              {[
                                { check: passwordStrength.checks.length, label: 'At least 12 characters' },
                                { check: passwordStrength.checks.lowercase, label: 'One lowercase letter' },
                                { check: passwordStrength.checks.uppercase, label: 'One uppercase letter' },
                                { check: passwordStrength.checks.number, label: 'One digit (0-9)' },
                              ].map((item, index) => (
                                <motion.div 
                                  key={index}
                                  className="flex items-center gap-2"
                                  variants={fadeUp}
                                >
                                  <motion.div
                                    animate={{ 
                                      scale: item.check ? [1, 1.2, 1] : 1,
                                      color: item.check ? 'hsl(92 14% 32%)' : 'hsl(92 12% 61% / 0.4)',
                                    }}
                                    transition={{ duration: 0.3 }}
                                  >
                                    <Check className="w-4 h-4" />
                                  </motion.div>
                                  <span
                                    className={cn(
                                      'text-xs transition-colors',
                                      item.check ? 'text-foreground' : 'text-muted-foreground'
                                    )}
                                  >
                                    {item.label}
                                  </span>
                                </motion.div>
                              ))}
                            </motion.div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>

                    <motion.div 
                      className="flex items-start gap-3"
                      variants={fadeUp}
                    >
                      <motion.div
                        whileTap={{ scale: 0.9 }}
                        whileHover={{ scale: 1.1 }}
                      >
                        <input
                          id="terms"
                          type="checkbox"
                          checked={agreed}
                          onChange={(e) => setAgreed(e.target.checked)}
                          className="mt-1 h-4 w-4 rounded border-border text-sage focus:ring-sage cursor-pointer"
                        />
                      </motion.div>
                      <Label
                        htmlFor="terms"
                        className="text-sm text-muted-foreground leading-relaxed cursor-pointer"
                      >
                        I agree to the{' '}
                        <Link href="/terms" className="text-sage hover:text-sage/80 hover:underline">
                          Terms of Service
                        </Link>{' '}
                        and{' '}
                        <Link href="/privacy" className="text-sage hover:text-sage/80 hover:underline">
                          Privacy Policy
                        </Link>
                      </Label>
                    </motion.div>

                    <motion.div variants={fadeUp}>
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
                    variants={fadeUp}
                  >
                    <p className="text-muted-foreground">
                      Already have an account?{' '}
                      <motion.span 
                        className="inline-block"
                        whileHover={{ scale: 1.05 }}
                      >
                        <Link
                          href="/login"
                          className="text-sage hover:text-sage/80 font-medium transition-colors"
                        >
                          Sign in
                        </Link>
                      </motion.span>
                    </p>
                  </motion.div>
                </Card>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
