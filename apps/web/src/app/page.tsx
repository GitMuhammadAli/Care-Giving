'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { AnimatedBackground } from '@/components/ui/animated-background';
import { ArrowRight, MessageSquareX, Pill, CheckCircle2 } from 'lucide-react';
import LayoutDashboardIcon from '@/components/icons/layout-dashboard-icon';
import UsersIcon from '@/components/icons/users-icon';
import FilledBellIcon from '@/components/icons/filled-bell-icon';
import ShieldCheck from '@/components/icons/shield-check';
import ClockIcon from '@/components/icons/clock-icon';
import HeartIcon from '@/components/icons/heart-icon';
import SparklesIcon from '@/components/icons/sparkles-icon';
import StarIcon from '@/components/icons/star-icon';
import { useAuthContext } from '@/components/providers/auth-provider';

// Pain points that resonate with caregivers (memoized outside component)
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
    icon: UsersIcon,
    problem: 'Sibling coordination nightmare',
    solution: 'Task assignment without guilt',
    description: 'Fair distribution of care duties. Everyone sees who\'s doing what—no awkward asks.',
  },
  {
    icon: FilledBellIcon,
    problem: 'Feeling out of the loop',
    solution: 'Real-time updates to everyone',
    description: 'Doctor visits, mood changes, small wins—everyone in the circle knows instantly.',
  },
] as const;

// Trust signals
const trustBadges = [
  { icon: ShieldCheck, text: 'Bank-level encryption' },
  { icon: ClockIcon, text: 'Set up in 2 minutes' },
  { icon: HeartIcon, text: '100% free forever' },
] as const;

// Social proof stats
const stats = [
  { value: '1000+', label: 'Families nationwide' },
  { value: 'Free', label: 'Forever, no catch' },
  { value: '2 min', label: 'Average setup time' },
] as const;

// Feature highlights for the app preview section
const appFeatures = [
  'Shared care timeline',
  'Medication reminders',
  'Task coordination',
  'Document storage',
  'Family chat',
  'Emergency contacts',
] as const;

// How it works steps
const howItWorksSteps = [
  {
    step: '1',
    title: 'Create your circle',
    description: 'Name it after your loved one. Takes 30 seconds.',
    icon: SparklesIcon,
  },
  {
    step: '2',
    title: 'Invite family',
    description: 'Send a link. Siblings, nurses, anyone who helps.',
    icon: UsersIcon,
  },
  {
    step: '3',
    title: 'Care together',
    description: 'Share updates, coordinate tasks, stay connected.',
    icon: HeartIcon,
  },
] as const;

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
] as const;

export default function LandingPage() {
  const { isAuthenticated, isInitialized, user } = useAuthContext();

  // Memoize the CTA component
  const MainCTA = useMemo(() => {
    const CTAComponent = ({ size = 'lg' as const, className = '' }) => (
      isInitialized && isAuthenticated && user ? (
        <Link href="/dashboard">
          <Button variant="editorial" size={size} className={`gap-2 ${className}`}>
            <LayoutDashboardIcon size={16} />
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
    return CTAComponent;
  }, [isInitialized, isAuthenticated, user]);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated Background - covers entire page */}
      <AnimatedBackground />
      
      <div className="relative z-10">
        <Header />

        <main>
          {/* ═══════════════════════════════════════════════════════════════
              HERO SECTION - Hit the pain point HARD
              Using CSS animations instead of framer-motion for GPU performance
          ═══════════════════════════════════════════════════════════════ */}
          <section className="min-h-[100dvh] pt-20 sm:pt-24 pb-12 sm:pb-16 texture-paper relative flex items-center">
            <div className="container mx-auto px-4 sm:px-6">
              <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                {/* Left - Main message */}
                <div className="lg:col-span-7 text-center lg:text-left">
                  {/* Empathy hook - CSS fade-in */}
                  <p 
                    className="text-sage-600 font-medium mb-3 sm:mb-4 flex items-center justify-center lg:justify-start gap-2 text-sm sm:text-base animate-fade-in-up"
                    style={{ animationDelay: '0ms' }}
                  >
                    <HeartIcon size={16} className="text-sage flex-shrink-0" />
                    <span>For the 53 million Americans caring for loved ones</span>
                  </p>

                  {/* Main headline - CSS fade-in with stagger */}
                  <h1 
                    className="font-editorial text-[2rem] sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl text-foreground leading-[1.1] sm:leading-[1.05] tracking-editorial mb-4 sm:mb-6 animate-fade-in-up"
                    style={{ animationDelay: '100ms' }}
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
                  </h1>

                  {/* Sub-headline - CSS fade-in */}
                  <p 
                    className="text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed mb-6 sm:mb-8 max-w-xl mx-auto lg:mx-0 animate-fade-in-up"
                    style={{ animationDelay: '200ms' }}
                  >
                    CareCircle brings your family together in one private space—so you can 
                    coordinate care, share updates, and actually <em>support</em> each other 
                    instead of chasing information.
                  </p>

                  {/* CTA buttons - CSS fade-in */}
                  <div 
                    className="flex flex-col sm:flex-row flex-wrap items-center justify-center lg:justify-start gap-3 sm:gap-4 mb-8 sm:mb-10 animate-fade-in-up"
                    style={{ animationDelay: '300ms' }}
                  >
                    <MainCTA />
                    <Link href="/how-it-works">
                      <Button variant="editorial-outline" size="lg" className="group w-full sm:w-auto">
                        See how it works
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </Button>
                    </Link>
                  </div>

                  {/* Trust badges - CSS fade-in */}
                  <div 
                    className="flex flex-wrap items-center justify-center lg:justify-start gap-4 sm:gap-6 text-xs sm:text-sm text-muted-foreground animate-fade-in"
                    style={{ animationDelay: '400ms' }}
                  >
                    {trustBadges.map((badge) => (
                      <span key={badge.text} className="flex items-center gap-1.5 sm:gap-2">
                        <badge.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sage" />
                        {badge.text}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Right - Visual proof / App preview mockup */}
                <div 
                  className="lg:col-span-5 animate-fade-in-right mt-4 lg:mt-0"
                  style={{ animationDelay: '300ms' }}
                >
                  <div className="relative mx-auto max-w-[320px] lg:max-w-none">
                    {/* Phone mockup frame */}
                    <div className="relative mx-auto w-[260px] sm:w-[280px] md:w-[320px] bg-foreground rounded-[36px] sm:rounded-[40px] p-2.5 sm:p-3 shadow-2xl shadow-foreground/20">
                      {/* Screen */}
                      <div className="bg-background rounded-[28px] sm:rounded-[32px] overflow-hidden">
                        {/* Status bar */}
                        <div className="bg-sage/10 px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between text-xs">
                          <span className="text-foreground font-medium">CareCircle</span>
                          <span className="text-muted-foreground">Today, 2:34 PM</span>
                        </div>
                        
                        {/* App content preview */}
                        <div className="p-3 sm:p-4 space-y-2.5 sm:space-y-3">
                          {/* Update card */}
                          <div className="bg-card border border-border rounded-xl p-2.5 sm:p-3">
                            <div className="flex items-start gap-2.5 sm:gap-3">
                              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-sage/20 flex items-center justify-center text-xs font-medium text-sage-700 flex-shrink-0">SM</div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs sm:text-sm font-medium text-foreground">Sarah shared an update</p>
                                <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">
                                  &quot;Mom had a great day! She remembered all our names at lunch 💚&quot;
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Medication reminder */}
                          <div className="bg-sage/10 border border-sage/20 rounded-xl p-2.5 sm:p-3">
                            <div className="flex items-center gap-2 text-sage-700">
                              <Pill className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              <span className="text-xs sm:text-sm font-medium">Medication given ✓</span>
                            </div>
                            <p className="text-[11px] sm:text-xs text-sage-600 mt-1">Metformin 500mg • 2:00 PM • by David</p>
                          </div>

                          {/* Task */}
                          <div className="bg-card border border-border rounded-xl p-2.5 sm:p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sage" />
                                <span className="text-xs sm:text-sm text-foreground">Pharmacy pickup</span>
                              </div>
                              <span className="text-[10px] sm:text-xs bg-terracotta/10 text-terracotta px-1.5 sm:px-2 py-0.5 rounded-full">Today</span>
                            </div>
                          </div>

                          {/* Family activity */}
                          <div className="flex items-center gap-2 px-1">
                            <div className="flex -space-x-2">
                              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-sage/30 border-2 border-background"></div>
                              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-terracotta/30 border-2 border-background"></div>
                              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-slate/30 border-2 border-background"></div>
                            </div>
                            <span className="text-[11px] sm:text-xs text-muted-foreground">3 family members active</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Floating badges - hidden on very small screens, visible from sm up */}
                    <div
                      className="hidden sm:block absolute -left-4 top-1/4 bg-background border border-border rounded-lg px-3 py-2 shadow-lg animate-scale-in"
                      style={{ animationDelay: '600ms' }}
                    >
                      <div className="flex items-center gap-2 text-sm">
                        <FilledBellIcon size={16} className="text-sage" />
                        <span className="text-foreground font-medium">Never miss an update</span>
                      </div>
                    </div>

                    <div
                      className="hidden sm:block absolute -right-4 bottom-1/4 bg-background border border-border rounded-lg px-3 py-2 shadow-lg animate-scale-in"
                      style={{ animationDelay: '800ms' }}
                    >
                      <div className="flex items-center gap-2 text-sm">
                        <ShieldCheck size={16} className="text-sage" />
                        <span className="text-foreground font-medium">Private & secure</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ═══════════════════════════════════════════════════════════════
              PAIN POINTS → SOLUTIONS SECTION
              Using CSS intersection observer animations
          ═══════════════════════════════════════════════════════════════ */}
          <section className="py-14 sm:py-20 bg-card content-section">
            <div className="container mx-auto px-4 sm:px-6">
              {/* Section header */}
              <div className="text-center mb-10 sm:mb-16">
                <p className="label-caps text-terracotta mb-3 sm:mb-4 animate-on-scroll">
                  We understand the chaos
                </p>
                <h2 className="font-editorial text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-foreground tracking-editorial max-w-3xl mx-auto animate-on-scroll">
                  Caregiving is hard enough.
                  <br />
                  <span className="text-muted-foreground">Coordination shouldn't be.</span>
                </h2>
              </div>

              {/* Pain points grid */}
              <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 max-w-5xl mx-auto">
                {painPoints.map((point, index) => (
                  <div
                    key={point.problem}
                    className="bg-background border border-border rounded-2xl p-5 sm:p-6 md:p-8 hover:border-sage/50 hover:shadow-lg transition-all duration-300 animate-on-scroll"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-terracotta/10 flex items-center justify-center">
                        <point.icon className="w-5 h-5 sm:w-6 sm:h-6 text-terracotta" />
                      </div>
                      <div>
                        {/* Problem */}
                        <p className="text-xs sm:text-sm text-terracotta font-medium mb-1 line-through decoration-terracotta/30">
                          {point.problem}
                        </p>
                        {/* Solution */}
                        <h3 className="font-editorial text-lg sm:text-xl text-foreground mb-1.5 sm:mb-2 tracking-editorial">
                          {point.solution}
                        </h3>
                        {/* Description */}
                        <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
                          {point.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ═══════════════════════════════════════════════════════════════
              SOCIAL PROOF - Stats & Trust
          ═══════════════════════════════════════════════════════════════ */}
          <section className="py-12 sm:py-16 texture-paper border-y border-border content-section">
            <div className="container mx-auto px-4 sm:px-6">
              <div className="grid grid-cols-3 gap-4 sm:gap-8 max-w-3xl mx-auto text-center">
                {stats.map((stat, index) => (
                  <div
                    key={stat.label}
                    className="animate-on-scroll"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <p className="font-editorial text-2xl sm:text-3xl md:text-4xl text-foreground">{stat.value}</p>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ═══════════════════════════════════════════════════════════════
              HOW IT WORKS - Simple 3 Steps
          ═══════════════════════════════════════════════════════════════ */}
          <section className="py-14 sm:py-20 bg-card content-section">
            <div className="container mx-auto px-4 sm:px-6">
              <div className="text-center mb-10 sm:mb-16">
                <p className="label-caps text-sage-600 mb-3 sm:mb-4 animate-on-scroll">
                  Getting started
                </p>
                <h2 className="font-editorial text-2xl sm:text-3xl md:text-4xl text-foreground tracking-editorial animate-on-scroll">
                  Up and running in <span className="text-sage">2 minutes</span>
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-6 md:gap-8 max-w-4xl mx-auto">
                {howItWorksSteps.map((item, index) => (
                  <div
                    key={item.step}
                    className="text-center animate-on-scroll"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-sage/10 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                      <item.icon className="w-6 h-6 sm:w-7 sm:h-7 text-sage" />
                    </div>
                    <div className="inline-block bg-sage/20 text-sage-700 text-xs font-semibold px-2 py-0.5 rounded-full mb-2 sm:mb-3">
                      Step {item.step}
                    </div>
                    <h3 className="font-editorial text-lg sm:text-xl text-foreground mb-1.5 sm:mb-2 tracking-editorial">
                      {item.title}
                    </h3>
                    <p className="text-muted-foreground text-xs sm:text-sm max-w-[250px] mx-auto">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ═══════════════════════════════════════════════════════════════
              TESTIMONIALS - Real Stories
          ═══════════════════════════════════════════════════════════════ */}
          <section className="py-14 sm:py-20 texture-paper content-section">
            <div className="container mx-auto px-4 sm:px-6">
              <div className="text-center mb-10 sm:mb-16">
                <p className="label-caps text-terracotta mb-3 sm:mb-4 animate-on-scroll">
                  From families like yours
                </p>
                <h2 className="font-editorial text-2xl sm:text-3xl md:text-4xl text-foreground tracking-editorial animate-on-scroll">
                  Real relief. Real families.
                </h2>
              </div>

              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto">
                {testimonials.map((testimonial, index) => (
                  <div
                    key={testimonial.author}
                    className="bg-card border border-border rounded-2xl p-5 sm:p-6 animate-on-scroll"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex gap-0.5 mb-3 sm:mb-4">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <StarIcon key={star} size={16} className="text-amber-400" />
                      ))}
                    </div>
                    <blockquote className="text-foreground text-sm sm:text-base leading-relaxed mb-4 sm:mb-6">
                      &ldquo;{testimonial.quote}&rdquo;
                    </blockquote>
                    <div className="flex items-center gap-3 pt-3 sm:pt-4 border-t border-border">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-sage/40 to-sage/20 flex items-center justify-center text-sage-700 font-medium text-xs sm:text-sm flex-shrink-0">
                        {testimonial.avatar}
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-foreground">{testimonial.author}</p>
                        <p className="text-[11px] sm:text-xs text-muted-foreground">{testimonial.role}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ═══════════════════════════════════════════════════════════════
              FINAL CTA - Strong Close
          ═══════════════════════════════════════════════════════════════ */}
          <section className="py-16 sm:py-24 md:py-32 bg-foreground text-background relative overflow-hidden content-section">
            {/* Subtle pattern */}
            <div className="absolute inset-0 opacity-5">
              <div className="absolute inset-0" style={{
                backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
                backgroundSize: '32px 32px',
              }} />
            </div>

            <div className="container mx-auto px-4 sm:px-6 relative z-10">
              <div className="max-w-3xl mx-auto text-center">
                <div className="animate-on-scroll">
                  <p className="label-caps text-sage mb-4 sm:mb-6">Ready to get organized?</p>
                  
                  <h2 className="font-editorial text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl text-background leading-[1.1] tracking-editorial mb-4 sm:mb-6">
                    Your family deserves{' '}
                    <em className="not-italic text-sage">peace of mind.</em>
                  </h2>

                  <p className="text-background/70 text-base sm:text-lg leading-relaxed mb-8 sm:mb-10 max-w-xl mx-auto">
                    Join families nationwide who&apos;ve replaced the chaos with calm. 
                    Create your free circle today—no credit card, no catch.
                  </p>

                  <div className="flex flex-wrap justify-center gap-4 mb-8 sm:mb-10">
                    {isInitialized && isAuthenticated && user ? (
                      <Link href="/dashboard">
                        <Button
                          size="xl"
                          className="bg-sage text-sage-900 hover:bg-sage/90 font-semibold gap-2"
                        >
                          <LayoutDashboardIcon size={20} />
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
                  <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-6 text-xs sm:text-sm text-background/50">
                    <span className="flex items-center gap-1.5 sm:gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      Free forever
                    </span>
                    <span className="flex items-center gap-1.5 sm:gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      No credit card
                    </span>
                    <span className="flex items-center gap-1.5 sm:gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      Set up in 2 minutes
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </div>
  );
}
