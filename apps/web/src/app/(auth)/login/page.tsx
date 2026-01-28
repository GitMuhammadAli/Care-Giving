'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Eye, EyeOff, Heart } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { ApiError } from '@/lib/api/client';
import { staggerContainer, fadeUp, scaleUp } from '@/lib/animations';

export default function LoginPage() {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setUnverifiedEmail('');
    setIsLoading(true);

    try {
      await login(formData);
      toast.success('Welcome back! Redirecting...');
    } catch (err) {
      if (err instanceof ApiError) {
        const errorMsg = err.message || 'Invalid email or password';

        if (errorMsg.toLowerCase().includes('verify') || errorMsg.toLowerCase().includes('verified')) {
          setUnverifiedEmail(formData.email);
          const verifyMsg = 'Please verify your email address before logging in.';
          setError(verifyMsg);
          toast.error(verifyMsg);
        } else {
          setError(errorMsg);
          toast.error(errorMsg);
        }
      } else {
        const genericError = 'Invalid email or password';
        setError(genericError);
        toast.error(genericError);
      }
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="w-full max-w-md mx-auto"
    >
      {/* Logo/Brand */}
      <motion.div variants={fadeUp} className="text-center mb-8">
        <motion.div 
          className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-sage/20 mb-4"
          whileHover={{ scale: 1.05, rotate: 5 }}
          whileTap={{ scale: 0.95 }}
        >
          <motion.div
            animate={{ 
              scale: [1, 1.1, 1],
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <Heart className="w-8 h-8 text-sage" />
          </motion.div>
        </motion.div>
        <motion.h1 
          className="font-serif text-3xl md:text-4xl text-foreground mb-2"
          variants={fadeUp}
        >
          Welcome Back
        </motion.h1>
        <motion.p 
          className="text-muted-foreground"
          variants={fadeUp}
        >
          Sign in to continue caring together
        </motion.p>
      </motion.div>

      {/* Form Card */}
      <motion.div variants={scaleUp}>
        <Card padding="spacious" className="shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
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
                  {unverifiedEmail && (
                    <motion.div 
                      className="mt-3 pt-3 border-t border-destructive/20"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      <Link
                        href={`/verify-email?email=${encodeURIComponent(unverifiedEmail)}`}
                        className="inline-flex items-center gap-2 text-sage hover:text-sage/80 font-medium transition-colors"
                      >
                        Verify Email Now →
                      </Link>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div 
              className="space-y-2"
              variants={fadeUp}
            >
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

            <motion.div 
              className="space-y-2"
              variants={fadeUp}
            >
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <motion.div whileHover={{ x: 2 }} transition={{ type: 'spring', stiffness: 400 }}>
                  <Link
                    href="/forgot-password"
                    className="text-sm text-sage hover:text-sage/80 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </motion.div>
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
            </motion.div>

            <motion.div variants={fadeUp}>
              <Button type="submit" variant="editorial" size="lg" fullWidth isLoading={isLoading}>
                Sign In
              </Button>
            </motion.div>
          </form>

          <motion.div 
            className="mt-6 space-y-3 text-center"
            variants={fadeUp}
          >
            <p className="text-muted-foreground">
              Don&apos;t have an account?{' '}
              <motion.span 
                className="inline-block"
                whileHover={{ scale: 1.05 }}
              >
                <Link
                  href="/register"
                  className="text-sage hover:text-sage/80 font-medium transition-colors"
                >
                  Create one
                </Link>
              </motion.span>
            </p>
            <p className="text-muted-foreground text-sm">
              Need to verify your email?{' '}
              <motion.span 
                className="inline-block"
                whileHover={{ scale: 1.05 }}
              >
                <Link
                  href="/verify-email"
                  className="text-sage hover:text-sage/80 font-medium transition-colors"
                >
                  Click here
                </Link>
              </motion.span>
            </p>
          </motion.div>
        </Card>
      </motion.div>

      {/* Trust message */}
      <motion.p 
        className="text-center text-sm text-muted-foreground mt-6"
        variants={fadeUp}
      >
        <motion.span
          className="inline-flex items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <motion.span
            className="w-2 h-2 rounded-full bg-sage"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          Your data is protected with enterprise-grade security
        </motion.span>
      </motion.p>
    </motion.div>
  );
}
