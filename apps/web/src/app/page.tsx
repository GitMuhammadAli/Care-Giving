'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { AnimatedBackground } from '@/components/ui/animated-background';
import {
  ArrowRight,
  LayoutDashboard,
  MessageSquareX,
  Pill,
  Users,
  Bell,
  Shield,
  Clock,
  Heart,
  CheckCircle2,
  Sparkles,
  Star,
} from 'lucide-react';
import { useAuthContext } from '@/components/providers/auth-provider';

// Pain points that resonate with caregivers
const painPoints = [
  {
    icon: MessageSquareX,
    problem: 'Group text chaos',
    solution: 'One shared space for updates',
    description: 'No more scrolling through 147 unread messages to find out if Dad took his medication.',
  },
  {
    icon: Pill,
    problem: '"Did anyone give Mom her pills?"',
    solution: 'Medication tracking & reminders',
    description: 'See at a glance what\'s been given, what\'s due, and who\'s handling it.',
  },
  {
    icon: Users,
    problem: 'Sibling coordination nightmare',
    solution: 'Task assignment without guilt',
    description: 'Fair distribution of care duties. Everyone sees who\'s doing what—no awkward asks.',
  },
  {
    icon: Bell,
    problem: 'Feeling out of the loop',
    solution: 'Real-time updates to everyone',
    description: 'Doctor visits, mood changes, small wins—everyone in the circle knows instantly.',
  },
];

// Trust signals
const trustBadges = [
  { icon: Shield, text: 'Bank-level encryption' },
  { icon: Clock, text: 'Set up in 2 minutes' },
  { icon: Heart, text: '100% free forever' },
];

// Social proof stats
const stats = [
  { value: '1000+', label: 'Families nationwide' },
  { value: 'Free', label: 'Forever, no catch' },
  { value: '2 min', label: 'Average setup time' },
];

// Feature highlights for the app preview section
const appFeatures = [
  'Shared care timeline',
  'Medication reminders',
  'Task coordination',
  'Document storage',
  'Family chat',
  'Emergency contacts',
];

// Testimonials - real pain, real relief
const testimonials = [
  {
    quote: "I was drowning in group texts and spreadsheets. Within a week of using CareCircle, I finally felt like I could breathe.",
    author: 'Jennifer W.',
    role: 'Caring for her mother with dementia',
    avatar: 'JW',
  },
  {
    quote: "My brothers and I live in different states. CareCircle is how we stay connected to Dad's care without the 'who's doing what' arguments.",
    author: 'Michael C.',
    role: 'Long-distance caregiver',
    avatar: 'MC',
  },
  {
    quote: "As a hospice nurse, being part of families' circles helps me provide better care. I see the full picture.",
    author: 'Patricia O., RN',
    role: 'Hospice care provider',
    avatar: 'PO',
  },
];

export default function LandingPage() {
  const { isAuthenticated, isInitialized, user } = useAuthContext();
  const router = useRouter();

  // Auto-redirect authenticated users to dashboard
  useEffect(() => {
    if (isInitialized && isAuthenticated && user) {
      router.push('/dashboard');
    }
  }, [isInitialized, isAuthenticated, user, router]);

  const MainCTA = ({ size = 'lg' as const, className = '' }) => (
    isInitialized && isAuthenticated && user ? (
      <Link href="/dashboard">
        <Button variant="editorial" size={size} className={`gap-2 ${className}`}>
          <LayoutDashboard className="w-4 h-4" />
          Go to Dashboard
        </Button>
      </Link>
    ) : (
      <Link href="/register">
        <Button variant="editorial" size={size} className={className}>
          Get organized in 2 minutes — free
        </Button>
      </Link>
    )
  );

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated Background - covers entire page */}
      <AnimatedBackground />
      
      <div className="relative z-10">
        <Header />

        <main>
          {/* ═══════════════════════════════════════════════════════════════
              HERO SECTION - Hit the pain point HARD
          ═══════════════════════════════════════════════════════════════ */}
          <section className="min-h-screen pt-24 pb-16 texture-paper relative flex items-center">
            <div className="container mx-auto px-6">
              <div className="grid lg:grid-cols-12 gap-12 items-center">
                {/* Left - Main message */}
                <div className="lg:col-span-7">
                  {/* Empathy hook */}
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="text-sage-600 font-medium mb-4 flex items-center gap-2"
                  >
                    <Heart className="w-4 h-4 text-sage fill-sage/30" />
                    For the 53 million Americans caring for loved ones
                  </motion.p>

                  {/* Main headline - direct, emotional */}
                  <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="font-editorial text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-foreground leading-[1.05] tracking-editorial mb-6"
                  >
                    Stop drowning in{' '}
                    <span className="relative inline-block">
                      <span className="text-terracotta">group texts.</span>
                      <svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 200 8" fill="none">
                        <path d="M2 6C50 2 150 2 198 6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-terracotta/30" />
                      </svg>
                    </span>
                    <br />
                    Start caring{' '}
                    <em className="not-italic text-sage">together.</em>
                  </motion.h1>

                  {/* Sub-headline - empathy + solution */}
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-8 max-w-xl"
                  >
                    CareCircle brings your family together in one private space—so you can 
                    coordinate care, share updates, and actually <em>support</em> each other 
                    instead of chasing information.
                  </motion.p>

                  {/* CTA buttons */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="flex flex-wrap items-center gap-4 mb-10"
                  >
                    <MainCTA />
                    <Link href="/how-it-works">
                      <Button variant="editorial-outline" size="lg" className="group">
                        See how it works
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </Button>
                    </Link>
                  </motion.div>

                  {/* Trust badges - inline */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground"
                  >
                    {trustBadges.map((badge) => (
                      <span key={badge.text} className="flex items-center gap-2">
                        <badge.icon className="w-4 h-4 text-sage" />
                        {badge.text}
                      </span>
                    ))}
                  </motion.div>
                </div>

                {/* Right - Visual proof / App preview mockup */}
                <motion.div
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                  className="lg:col-span-5"
                >
                  <div className="relative">
                    {/* Phone mockup frame */}
                    <div className="relative mx-auto w-[280px] md:w-[320px] bg-foreground rounded-[40px] p-3 shadow-2xl shadow-foreground/20">
                      {/* Screen */}
                      <div className="bg-background rounded-[32px] overflow-hidden">
                        {/* Status bar */}
                        <div className="bg-sage/10 px-6 py-3 flex items-center justify-between text-xs">
                          <span className="text-foreground font-medium">CareCircle</span>
                          <span className="text-muted-foreground">Today, 2:34 PM</span>
                        </div>
                        
                        {/* App content preview */}
                        <div className="p-4 space-y-3">
                          {/* Update card */}
                          <div className="bg-card border border-border rounded-xl p-3">
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-full bg-sage/20 flex items-center justify-center text-xs font-medium text-sage-700">SM</div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground">Sarah shared an update</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  &quot;Mom had a great day! She remembered all our names at lunch 💚&quot;
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Medication reminder */}
                          <div className="bg-sage/10 border border-sage/20 rounded-xl p-3">
                            <div className="flex items-center gap-2 text-sage-700">
                              <Pill className="w-4 h-4" />
                              <span className="text-sm font-medium">Medication given ✓</span>
                            </div>
                            <p className="text-xs text-sage-600 mt-1">Metformin 500mg • 2:00 PM • by David</p>
                          </div>

                          {/* Task */}
                          <div className="bg-card border border-border rounded-xl p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-sage" />
                                <span className="text-sm text-foreground">Pharmacy pickup</span>
                              </div>
                              <span className="text-xs bg-terracotta/10 text-terracotta px-2 py-0.5 rounded-full">Today</span>
                            </div>
                          </div>

                          {/* Family activity */}
                          <div className="flex items-center gap-2 px-1">
                            <div className="flex -space-x-2">
                              <div className="w-6 h-6 rounded-full bg-sage/30 border-2 border-background"></div>
                              <div className="w-6 h-6 rounded-full bg-terracotta/30 border-2 border-background"></div>
                              <div className="w-6 h-6 rounded-full bg-slate/30 border-2 border-background"></div>
                            </div>
                            <span className="text-xs text-muted-foreground">3 family members active</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Floating badges */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5, delay: 0.6 }}
                      className="absolute -left-4 top-1/4 bg-background border border-border rounded-lg px-3 py-2 shadow-lg"
                    >
                      <div className="flex items-center gap-2 text-sm">
                        <Bell className="w-4 h-4 text-sage" />
                        <span className="text-foreground font-medium">Never miss an update</span>
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5, delay: 0.8 }}
                      className="absolute -right-4 bottom-1/4 bg-background border border-border rounded-lg px-3 py-2 shadow-lg"
                    >
                      <div className="flex items-center gap-2 text-sm">
                        <Shield className="w-4 h-4 text-sage" />
                        <span className="text-foreground font-medium">Private & secure</span>
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              </div>
            </div>
          </section>

          {/* ═══════════════════════════════════════════════════════════════
              PAIN POINTS → SOLUTIONS SECTION
          ═══════════════════════════════════════════════════════════════ */}
          <section className="py-20 bg-card">
            <div className="container mx-auto px-6">
              {/* Section header */}
              <div className="text-center mb-16">
                <motion.p
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  className="label-caps text-terracotta mb-4"
                >
                  We understand the chaos
                </motion.p>
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="font-editorial text-3xl md:text-4xl lg:text-5xl text-foreground tracking-editorial max-w-3xl mx-auto"
                >
                  Caregiving is hard enough.
                  <br />
                  <span className="text-muted-foreground">Coordination shouldn't be.</span>
                </motion.h2>
              </div>

              {/* Pain points grid */}
              <div className="grid md:grid-cols-2 gap-6 lg:gap-8 max-w-5xl mx-auto">
                {painPoints.map((point, index) => (
                  <motion.div
                    key={point.problem}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-background border border-border rounded-2xl p-6 md:p-8 hover:border-sage/50 hover:shadow-lg transition-all duration-300"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-terracotta/10 flex items-center justify-center">
                        <point.icon className="w-6 h-6 text-terracotta" />
                      </div>
                      <div>
                        {/* Problem */}
                        <p className="text-sm text-terracotta font-medium mb-1 line-through decoration-terracotta/30">
                          {point.problem}
                        </p>
                        {/* Solution */}
                        <h3 className="font-editorial text-xl text-foreground mb-2 tracking-editorial">
                          {point.solution}
                        </h3>
                        {/* Description */}
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          {point.description}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* ═══════════════════════════════════════════════════════════════
              SOCIAL PROOF - Stats & Trust
          ═══════════════════════════════════════════════════════════════ */}
          <section className="py-16 texture-paper border-y border-border">
            <div className="container mx-auto px-6">
              <div className="grid grid-cols-3 gap-8 max-w-3xl mx-auto text-center">
                {stats.map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <p className="font-editorial text-3xl md:text-4xl text-foreground">{stat.value}</p>
                      {stat.stars && (
                        <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* ═══════════════════════════════════════════════════════════════
              HOW IT WORKS - Simple 3 Steps
          ═══════════════════════════════════════════════════════════════ */}
          <section className="py-20 bg-card">
            <div className="container mx-auto px-6">
              <div className="text-center mb-16">
                <motion.p
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  className="label-caps text-sage-600 mb-4"
                >
                  Getting started
                </motion.p>
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="font-editorial text-3xl md:text-4xl text-foreground tracking-editorial"
                >
                  Up and running in <span className="text-sage">2 minutes</span>
                </motion.h2>
              </div>

              <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                {[
                  {
                    step: '1',
                    title: 'Create your circle',
                    description: 'Name it after your loved one. Takes 30 seconds.',
                    icon: Sparkles,
                  },
                  {
                    step: '2',
                    title: 'Invite family',
                    description: 'Send a link. Siblings, nurses, anyone who helps.',
                    icon: Users,
                  },
                  {
                    step: '3',
                    title: 'Care together',
                    description: 'Share updates, coordinate tasks, stay connected.',
                    icon: Heart,
                  },
                ].map((item, index) => (
                  <motion.div
                    key={item.step}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="text-center"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-sage/10 flex items-center justify-center mx-auto mb-4">
                      <item.icon className="w-7 h-7 text-sage" />
                    </div>
                    <div className="inline-block bg-sage/20 text-sage-700 text-xs font-semibold px-2 py-0.5 rounded-full mb-3">
                      Step {item.step}
                    </div>
                    <h3 className="font-editorial text-xl text-foreground mb-2 tracking-editorial">
                      {item.title}
                    </h3>
                    <p className="text-muted-foreground text-sm">{item.description}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* ═══════════════════════════════════════════════════════════════
              TESTIMONIALS - Real Stories
          ═══════════════════════════════════════════════════════════════ */}
          <section className="py-20 texture-paper">
            <div className="container mx-auto px-6">
              <div className="text-center mb-16">
                <motion.p
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  className="label-caps text-terracotta mb-4"
                >
                  From families like yours
                </motion.p>
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="font-editorial text-3xl md:text-4xl text-foreground tracking-editorial"
                >
                  Real relief. Real families.
                </motion.h2>
              </div>

              <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {testimonials.map((testimonial, index) => (
                  <motion.div
                    key={testimonial.author}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-card border border-border rounded-2xl p-6"
                  >
                    <div className="flex gap-0.5 mb-4">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star key={star} className="w-4 h-4 text-amber-400 fill-amber-400" />
                      ))}
                    </div>
                    <blockquote className="text-foreground leading-relaxed mb-6">
                      &ldquo;{testimonial.quote}&rdquo;
                    </blockquote>
                    <div className="flex items-center gap-3 pt-4 border-t border-border">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sage/40 to-sage/20 flex items-center justify-center text-sage-700 font-medium text-sm">
                        {testimonial.avatar}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{testimonial.author}</p>
                        <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* ═══════════════════════════════════════════════════════════════
              FINAL CTA - Strong Close
          ═══════════════════════════════════════════════════════════════ */}
          <section className="py-24 md:py-32 bg-foreground text-background relative overflow-hidden">
            {/* Subtle pattern */}
            <div className="absolute inset-0 opacity-5">
              <div className="absolute inset-0" style={{
                backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
                backgroundSize: '32px 32px',
              }} />
            </div>

            <div className="container mx-auto px-6 relative z-10">
              <div className="max-w-3xl mx-auto text-center">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                >
                  <p className="label-caps text-sage mb-6">Ready to get organized?</p>
                  
                  <h2 className="font-editorial text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-background leading-[1.1] tracking-editorial mb-6">
                    Your family deserves{' '}
                    <em className="not-italic text-sage">peace of mind.</em>
                  </h2>

                  <p className="text-background/70 text-lg leading-relaxed mb-10 max-w-xl mx-auto">
                    Join families nationwide who&apos;ve replaced the chaos with calm. 
                    Create your free circle today—no credit card, no catch.
                  </p>

                  <div className="flex flex-wrap justify-center gap-4 mb-10">
                    {isInitialized && isAuthenticated && user ? (
                      <Link href="/dashboard">
                        <Button
                          size="xl"
                          className="bg-sage text-sage-900 hover:bg-sage/90 font-semibold gap-2"
                        >
                          <LayoutDashboard className="w-5 h-5" />
                          Go to Dashboard
                        </Button>
                      </Link>
                    ) : (
                      <Link href="/register">
                        <Button
                          size="xl"
                          className="bg-sage text-sage-900 hover:bg-sage/90 font-semibold"
                        >
                          Create your free circle
                          <ArrowRight className="w-5 h-5 ml-2" />
                        </Button>
                      </Link>
                    )}
                  </div>

                  {/* Final trust signals */}
                  <div className="flex flex-wrap justify-center items-center gap-6 text-sm text-background/50">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Free forever
                    </span>
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      No credit card
                    </span>
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Set up in 2 minutes
                    </span>
                  </div>
                </motion.div>
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </div>
  );
}
