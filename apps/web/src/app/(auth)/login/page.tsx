'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Eye, EyeOff, Heart } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { ApiError } from '@/lib/api/client';
import { AUTH } from '@/lib/messages';

/**
 * UNIQUE "Welcome Embrace" Login Animation
 * - Heartbeat icon animation
 * - Organic staggered reveals
 * - Warmth wave across form
 */

// Unique stagger animation
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
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

// Heartbeat animation
const heartbeatVariants = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 15,
      delay: 0.2,
    },
  },
  pulse: {
    scale: [1, 1.15, 1, 1.1, 1],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      repeatDelay: 3,
      ease: 'easeInOut',
    },
  },
};

function LoginContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { login, user } = useAuth();
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
      toast.success(AUTH.LOGIN_SUCCESS);
      
      // Get the updated user state after login
      const authState = useAuth.getState();
      const loggedInUser = authState.user;
      
      // Check for return URL first
      const returnUrl = searchParams.get('returnUrl');
      if (returnUrl) {
        router.push(returnUrl);
        return;
      }
      
      // Redirect based on systemRole
      if (loggedInUser?.systemRole === 'ADMIN' || loggedInUser?.systemRole === 'SUPER_ADMIN') {
        router.push('/admin/overview');
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      if (err instanceof ApiError) {
        const errorMsg = err.message || AUTH.LOGIN_FAILED;

        if (errorMsg.toLowerCase().includes('verify') || errorMsg.toLowerCase().includes('verified')) {
          setUnverifiedEmail(formData.email);
          setError(AUTH.ACCOUNT_NOT_VERIFIED);
          toast.error(AUTH.ACCOUNT_NOT_VERIFIED);
        } else {
          setError(errorMsg);
          toast.error(errorMsg);
        }
      } else {
        setError(AUTH.LOGIN_FAILED);
        toast.error(AUTH.LOGIN_FAILED);
      }
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full max-w-md mx-auto"
    >
      {/* Logo/Brand with heartbeat */}
      <motion.div variants={itemVariants} className="text-center mb-8">
        <motion.div
          variants={heartbeatVariants}
          initial="hidden"
          animate={['visible', 'pulse']}
          className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-sage/20 mb-4 relative"
        >
          {/* Pulse rings */}
          <motion.div
            className="absolute inset-0 rounded-full bg-sage/10"
            animate={{
              scale: [1, 1.5, 1.5],
              opacity: [0.5, 0, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatDelay: 2,
            }}
          />
          <Heart className="w-8 h-8 text-sage relative z-10" />
        </motion.div>
        
        <motion.h1
          className="font-serif text-3xl md:text-4xl text-foreground mb-2"
          variants={itemVariants}
        >
          Welcome Back
        </motion.h1>
        <motion.p
          className="text-muted-foreground"
          variants={itemVariants}
        >
          Sign in to continue caring together
        </motion.p>
      </motion.div>

      {/* Form Card */}
      <motion.div variants={itemVariants}>
        <Card padding="spacious" className="shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
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
            </AnimatePresence>

            <motion.div
              className="space-y-2"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.3 }}
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
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.3 }}
            >
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
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.3 }}
            >
              <Button type="submit" variant="editorial" size="lg" fullWidth isLoading={isLoading}>
                Sign In
              </Button>
            </motion.div>
          </form>

          <motion.div
            className="mt-6 space-y-3 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.3 }}
          >
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
          </motion.div>
        </Card>
      </motion.div>

      {/* Trust message */}
      <motion.p
        className="text-center text-sm text-muted-foreground mt-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.3 }}
      >
        Your data is protected with enterprise-grade security
      </motion.p>
    </motion.div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="w-full max-w-md mx-auto flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sage" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
