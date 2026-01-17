'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { ArrowRight, LayoutDashboard } from 'lucide-react';
import { useAuthContext } from '@/components/providers/auth-provider';

// Static data matching pixel-perfect exactly
const stats = [
  { value: '50,000+', label: 'Families' },
  { value: '4.9', label: 'App Store rating' },
  { value: '100%', label: 'Free forever' },
];

const features = [
  {
    number: '01',
    title: 'Private by design',
    description: 'Your circle is yours alone. No ads, no data harvesting, no strangers. Just family.',
  },
  {
    number: '02',
    title: 'Shared awareness',
    description: "Everyone stays informed without the endless text chains. One place, one truth.",
  },
  {
    number: '03',
    title: 'Gentle coordination',
    description: 'Assign tasks without guilt. Request help without friction. Care without burnout.',
  },
  {
    number: '04',
    title: 'Lasting memory',
    description: "Every update becomes part of your family's story. A record of love, preserved.",
  },
  {
    number: '05',
    title: 'Simple by choice',
    description: 'No learning curve. No feature overload. Just the tools you actually need.',
  },
  {
    number: '06',
    title: 'Always free',
    description: "Caring for family shouldn't cost extra. CareCircle is free, today and always.",
  },
];

const howItWorks = [
  {
    step: 'First',
    title: 'Create your circle',
    description: "Name it after your loved one. Add a photo if you'd like. It takes thirty seconds.",
  },
  {
    step: 'Then',
    title: 'Invite your people',
    description: 'Send a simple link. Siblings, spouses, nurses, neighbors—anyone who helps.',
  },
  {
    step: 'Finally',
    title: 'Care together',
    description:
      'Share updates. Coordinate visits. Track medications. Celebrate small wins. Grieve together when needed.',
  },
];

const testimonials = [
  {
    id: 1,
    quote:
      "When Dad was diagnosed, our family scattered across four states suddenly needed to become a team. CareCircle gave us a home base. It's been two years now, and I can't imagine doing this without it.",
    author: 'Jennifer Walsh',
    role: 'Caring for her father in Portland, OR',
    featured: true,
  },
  {
    id: 2,
    quote: "No more group text chaos. No more 'did anyone call the pharmacy?' Now we just know.",
    author: 'Michael & David Chen',
    role: 'Brothers, San Francisco',
    featured: false,
  },
  {
    id: 3,
    quote:
      "As her hospice nurse, being invited into the family's circle helped me provide better care. I could see the full picture.",
    author: 'Nurse Patricia Okonkwo',
    role: 'Hospice care provider',
    featured: false,
  },
];

export default function LandingPage() {
  const featured = testimonials.find((t) => t.featured);
  const secondary = testimonials.filter((t) => !t.featured).slice(0, 2);
  const { isAuthenticated, isInitialized, user } = useAuthContext();
  const router = useRouter();

  // Auto-redirect authenticated users to dashboard
  useEffect(() => {
    if (isInitialized && isAuthenticated && user) {
      router.push('/dashboard');
    }
  }, [isInitialized, isAuthenticated, user, router]);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main>
        {/* Hero Section - Pixel Perfect */}
        <section className="min-h-screen pt-20 texture-paper">
          <div className="container mx-auto px-6">
            {/* Editorial masthead */}
            <div className="border-b border-border pb-6 mb-12">
              <div className="flex items-end justify-between">
                <p className="label-caps text-slate">Issue No. 01 — Family Care</p>
                <p className="text-sm text-muted-foreground hidden md:block">Est. 2024</p>
              </div>
            </div>

            {/* Main headline - full width impact */}
            <div className="mb-16">
              <motion.h1
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8 }}
                className="font-editorial text-5xl md:text-7xl lg:text-8xl text-foreground leading-[0.95] tracking-editorial mb-8 max-w-5xl"
              >
                Where families <em className="not-italic text-sage">gather</em> to care for those who
                matter most
              </motion.h1>
            </div>

            {/* Split content */}
            <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 pb-20">
              {/* Left - Intro text */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.1 }}
                className="lg:col-span-4"
              >
                <p className="text-muted-foreground text-lg leading-relaxed mb-8">
                  A private space for coordinating care with grace. Share updates, organize tasks,
                  and stay connected—without the noise.
                </p>

                <div className="flex flex-wrap items-center gap-3">
                  {isInitialized && isAuthenticated && user ? (
                    <Link href="/dashboard">
                      <Button variant="editorial" size="lg" className="gap-2">
                        <LayoutDashboard className="w-4 h-4" />
                        Go to Dashboard
                      </Button>
                    </Link>
                  ) : (
                    <Link href="/register">
                      <Button variant="editorial" size="lg">
                        Create your circle
                      </Button>
                    </Link>
                  )}
                  <Link href="/how-it-works">
                    <Button variant="editorial-outline" size="lg" className="group">
                      Learn more
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </Link>
                </div>
              </motion.div>

              {/* Center - Visual card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="lg:col-span-4 lg:col-start-6"
              >
                <div className="border border-border bg-card p-6">
                  <p className="label-caps text-slate mb-4">Latest update</p>
                  <p className="font-editorial text-xl text-foreground leading-snug mb-6">
                    &ldquo;Mom had her best day in weeks. She walked to the garden and sat in the sun
                    for an hour.&rdquo;
                  </p>
                  <div className="flex items-center gap-3 pt-4 border-t border-border">
                    <div className="w-10 h-10 rounded-full bg-sage/30" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Sarah M.</p>
                      <p className="text-xs text-muted-foreground">2 hours ago</p>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Right - Stats */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="lg:col-span-3 lg:col-start-10"
              >
                <div className="space-y-8">
                  {stats.map((stat, index) => (
                    <div key={stat.label} className={index > 0 ? 'pt-8 border-t border-border' : ''}>
                      <p className="font-editorial text-4xl text-foreground mb-1">{stat.value}</p>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>

          {/* Bottom rule with accent */}
          <div className="border-t border-border">
            <div className="container mx-auto px-6">
              <div className="flex items-center justify-between py-4 text-sm text-muted-foreground">
                <span>Scroll to explore</span>
                <span className="hidden md:block">Private · Simple · Together</span>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section - Pixel Perfect */}
        <section id="about" className="py-24 bg-card">
          <div className="container mx-auto px-6">
            {/* Section header - editorial style */}
            <div className="border-b border-border pb-8 mb-16">
              <div className="grid lg:grid-cols-2 gap-8">
                <div>
                  <p className="label-caps text-terracotta mb-4">What we offer</p>
                  <h2 className="font-editorial text-3xl md:text-4xl text-foreground leading-tight tracking-editorial">
                    Care should feel <em className="not-italic text-sage">intentional</em>, not
                    overwhelming
                  </h2>
                </div>
                <div className="flex items-end">
                  <p className="text-muted-foreground text-lg leading-relaxed max-w-md">
                    We believe that caring for someone you love shouldn&apos;t come with chaos.
                    CareCircle is where families find peace of mind—together.
                  </p>
                </div>
              </div>
            </div>

            {/* Feature list - editorial numbered list */}
            <div className="space-y-0">
              {features.map((feature) => (
                <motion.div
                  key={feature.number}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                  className="grid lg:grid-cols-12 gap-6 py-10 border-b border-border group hover:bg-background/50 transition-colors duration-300 -mx-6 px-6"
                >
                  <div className="lg:col-span-1">
                    <span className="font-editorial text-3xl text-terracotta/60">
                      {feature.number}
                    </span>
                  </div>
                  <div className="lg:col-span-4">
                    <h3 className="font-editorial text-2xl text-foreground tracking-editorial">
                      {feature.title}
                    </h3>
                  </div>
                  <div className="lg:col-span-5 lg:col-start-7">
                    <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section - Pixel Perfect */}
        <section id="how-it-works" className="py-24 texture-paper">
          <div className="container mx-auto px-6">
            {/* Asymmetric layout */}
            <div className="grid lg:grid-cols-12 gap-12">
              {/* Left column - sticky intro */}
              <div className="lg:col-span-4">
                <div className="lg:sticky lg:top-24">
                  <p className="label-caps text-slate mb-4">How it works</p>
                  <h2 className="font-editorial text-3xl md:text-4xl text-foreground leading-tight tracking-editorial mb-6">
                    Getting started takes{' '}
                    <em className="not-italic text-sage">minutes</em>
                  </h2>
                  <p className="text-muted-foreground leading-relaxed mb-8">
                    No complicated setup. No learning curve. Just a simple way to bring your family
                    together around the care that matters.
                  </p>
                  {isInitialized && isAuthenticated && user ? (
                    <Link href="/dashboard">
                      <Button variant="editorial" size="lg" className="gap-2">
                        <LayoutDashboard className="w-4 h-4" />
                        Dashboard
                      </Button>
                    </Link>
                  ) : (
                    <Link href="/how-it-works">
                      <Button variant="editorial-outline" size="lg">
                        See full guide
                      </Button>
                    </Link>
                  )}
                </div>
              </div>

              {/* Right column - steps */}
              <div className="lg:col-span-7 lg:col-start-6">
                <div className="space-y-0">
                  {howItWorks.map((step) => (
                    <motion.div
                      key={step.step}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      className="grid grid-cols-12 gap-6 py-12 border-t border-border"
                    >
                      <div className="col-span-2 md:col-span-1">
                        <span className="font-editorial text-5xl text-terracotta/40">
                          {step.step}
                        </span>
                      </div>
                      <div className="col-span-10 md:col-span-11 md:pl-8">
                        <h3 className="font-editorial text-2xl text-foreground mb-4 tracking-editorial">
                          {step.title}
                        </h3>
                        <p className="text-muted-foreground leading-relaxed max-w-lg">
                          {step.description}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stories Section - Pixel Perfect */}
        <section id="stories" className="py-24 bg-card">
          <div className="container mx-auto px-6">
            {/* Section header */}
            <div className="border-b border-border pb-8 mb-16">
              <div className="flex items-end justify-between">
                <div>
                  <p className="label-caps text-slate mb-4">Stories</p>
                  <h2 className="font-editorial text-3xl md:text-4xl text-foreground tracking-editorial">
                    From families who found their footing
                  </h2>
                </div>
                <Link
                  href="/stories"
                  className="hidden md:block text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  View all stories →
                </Link>
              </div>
            </div>

            {/* Featured quote - full width */}
            {featured && (
              <div className="mb-16">
                <blockquote className="max-w-4xl">
                  <p className="font-editorial text-3xl md:text-4xl lg:text-5xl text-foreground leading-[1.15] tracking-editorial mb-10">
                    &ldquo;{featured.quote}&rdquo;
                  </p>
                  <footer className="flex items-center gap-4 pt-8 border-t border-border">
                    <div className="w-14 h-14 rounded-full bg-sage/30" />
                    <div>
                      <p className="font-medium text-foreground">{featured.author}</p>
                      <p className="text-sm text-muted-foreground">{featured.role}</p>
                    </div>
                  </footer>
                </blockquote>
              </div>
            )}

            {/* Secondary testimonials - grid */}
            <div className="grid md:grid-cols-2 gap-px bg-border mt-16">
              {secondary.map((testimonial) => (
                <div key={testimonial.id} className="bg-card p-8 md:p-10">
                  <blockquote>
                    <p className="text-foreground text-lg leading-relaxed mb-8">
                      &ldquo;{testimonial.quote}&rdquo;
                    </p>
                    <footer className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-terracotta/20" />
                      <div>
                        <p className="font-medium text-foreground text-sm">{testimonial.author}</p>
                        <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                      </div>
                    </footer>
                  </blockquote>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Community Section - Pixel Perfect (Dark CTA) */}
        <section className="py-32 bg-foreground text-background">
          <div className="container mx-auto px-6">
            <div className="grid lg:grid-cols-12 gap-12 items-center">
              {/* Left - Main CTA */}
              <div className="lg:col-span-7">
                <p className="label-caps text-background/50 mb-6">Begin your journey</p>

                <h2 className="font-editorial text-4xl md:text-5xl lg:text-6xl text-background leading-[1.1] tracking-editorial mb-8">
                  Your family deserves a <em className="not-italic text-sage">quieter</em> way to
                  care
                </h2>

                <p className="text-background/60 text-lg leading-relaxed mb-10 max-w-lg">
                  Join thousands of families who&apos;ve found peace of mind through coordinated
                  care. Start your circle today—it&apos;s free, private, and takes less than a
                  minute.
                </p>

                <div className="flex flex-wrap gap-4">
                  {isInitialized && isAuthenticated && user ? (
                    <Link href="/dashboard">
                      <Button
                        variant="outline"
                        size="xl"
                        className="border-background/30 text-background hover:bg-background/10 hover:border-background/50 tracking-caps uppercase text-xs font-semibold gap-2"
                      >
                        <LayoutDashboard className="w-4 h-4" />
                        Go to Dashboard
                      </Button>
                    </Link>
                  ) : (
                    <Link href="/register">
                      <Button
                        variant="outline"
                        size="xl"
                        className="border-background/30 text-background hover:bg-background/10 hover:border-background/50 tracking-caps uppercase text-xs font-semibold"
                      >
                        Create your circle
                      </Button>
                    </Link>
                  )}
                  <Link href="/how-it-works">
                    <Button
                      variant="ghost"
                      size="xl"
                      className="text-background/70 hover:text-background hover:bg-transparent tracking-caps uppercase text-xs font-semibold"
                    >
                      Learn more →
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Right - Trust signals */}
              <div className="lg:col-span-4 lg:col-start-9">
                <div className="space-y-8 border-l border-background/20 pl-8">
                  <div>
                    <p className="font-editorial text-4xl text-background mb-2">Free</p>
                    <p className="text-background/50 text-sm">Forever, no credit card</p>
                  </div>
                  <div>
                    <p className="font-editorial text-4xl text-background mb-2">Private</p>
                    <p className="text-background/50 text-sm">Your data stays yours</p>
                  </div>
                  <div>
                    <p className="font-editorial text-4xl text-background mb-2">Simple</p>
                    <p className="text-background/50 text-sm">Setup in under a minute</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
