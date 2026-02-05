'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Users,
  MessageSquare,
  Calendar,
  Heart,
  Shield,
  Clock,
  Pill,
  FileText,
  Bell,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  PlayCircle,
} from 'lucide-react';

const steps = [
  {
    number: '01',
    title: 'Create your circle',
    description: 'Name it after your loved one—"Mom\'s Care Circle" or "Dad\'s Team." Upload a photo if you\'d like.',
    detail: 'Takes about 30 seconds. Your circle is completely private from day one.',
    icon: Sparkles,
  },
  {
    number: '02',
    title: 'Invite your people',
    description: 'Share a simple link via text, email, or however you communicate. Anyone can join—siblings, spouses, nurses, neighbors.',
    detail: 'Different roles can have different permissions. You control who sees what.',
    icon: Users,
  },
  {
    number: '03',
    title: 'Start sharing',
    description: 'Post your first update. It could be a medical note, a good day, a small victory, or a request for help.',
    detail: 'Everyone in the circle gets notified instantly. No more repeating yourself.',
    icon: MessageSquare,
  },
  {
    number: '04',
    title: 'Coordinate together',
    description: 'Add tasks, schedule visits, track medications. See who\'s doing what and when.',
    detail: 'The calendar keeps everyone aligned. No more double-booking or gaps in care.',
    icon: Calendar,
  },
];

const features = [
  {
    icon: MessageSquare,
    title: 'Shared Timeline',
    description: 'One place for all updates. No more scattered texts, emails, and voicemails.',
  },
  {
    icon: Pill,
    title: 'Medication Tracking',
    description: 'Log doses, set reminders, and see at a glance what\'s been given.',
  },
  {
    icon: Calendar,
    title: 'Visit Coordination',
    description: 'See who\'s visiting when. Avoid overlaps. Fill gaps.',
  },
  {
    icon: FileText,
    title: 'Document Storage',
    description: 'Keep insurance cards, prescriptions, and advance directives in one secure place.',
  },
  {
    icon: Bell,
    title: 'Smart Reminders',
    description: 'Get notified about medications, appointments, and tasks—nothing falls through the cracks.',
  },
  {
    icon: Shield,
    title: 'Bank-Level Security',
    description: 'End-to-end encryption. HIPAA-compliant. Your data never leaves your circle.',
  },
];

export default function HowItWorksPage() {
  return (
    <>
      {/* Hero */}
      <section className="py-20 md:py-28 texture-paper">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 mb-6"
              >
                <PlayCircle className="w-5 h-5 text-sage" />
                <span className="label-caps text-sage-600">How It Works</span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="font-editorial text-4xl md:text-5xl lg:text-6xl text-foreground leading-[1.05] tracking-editorial mb-8"
              >
                Simple tools for{' '}
                <em className="not-italic text-sage">complex</em> care
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-xl text-muted-foreground leading-relaxed mb-8"
              >
                CareCircle brings your care team together in one private space. 
                No learning curve. No feature overload. Just the tools you actually need.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-wrap gap-4"
              >
                <Link href="/register">
                  <Button variant="editorial" size="lg">
                    Get started free
                  </Button>
                </Link>
                <Button variant="editorial-outline" size="lg" className="gap-2 opacity-60 cursor-not-allowed" disabled>
                  <PlayCircle className="w-4 h-4" />
                  Demo coming soon
                </Button>
              </motion.div>
            </div>

            {/* Visual */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="relative"
            >
              <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-xl">
                <div className="flex items-center gap-3 mb-6 pb-6 border-b border-border">
                  <div className="w-12 h-12 rounded-full bg-sage/20 flex items-center justify-center">
                    <Heart className="w-6 h-6 text-sage" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Mom's Care Circle</p>
                    <p className="text-sm text-muted-foreground">5 members • Active now</p>
                  </div>
                </div>
                <div className="space-y-4">
                  {['Sarah shared an update', 'David gave medication', 'Emily scheduled visit'].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-background rounded-lg">
                      <CheckCircle2 className="w-5 h-5 text-sage flex-shrink-0" />
                      <span className="text-sm text-foreground">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="py-20 bg-card">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <p className="label-caps text-terracotta mb-4">Four Simple Steps</p>
            <h2 className="font-editorial text-3xl md:text-4xl text-foreground tracking-editorial">
              Up and running in <span className="text-sage">2 minutes</span>
            </h2>
          </div>

          <div className="max-w-4xl mx-auto">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="grid md:grid-cols-12 gap-6 py-10 border-b border-border last:border-0"
              >
                <div className="md:col-span-1">
                  <span className="font-editorial text-3xl text-terracotta/60">{step.number}</span>
                </div>
                <div className="md:col-span-5 flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-sage/10 flex items-center justify-center flex-shrink-0">
                    <step.icon className="w-6 h-6 text-sage" />
                  </div>
                  <h3 className="font-editorial text-2xl text-foreground tracking-editorial">
                    {step.title}
                  </h3>
                </div>
                <div className="md:col-span-6">
                  <p className="text-foreground leading-relaxed mb-2">{step.description}</p>
                  <p className="text-sm text-muted-foreground">{step.detail}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 texture-paper">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <p className="label-caps text-sage-600 mb-4">Everything You Need</p>
            <h2 className="font-editorial text-3xl md:text-4xl text-foreground tracking-editorial mb-4">
              Powerful features, zero complexity
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              We built only what matters. No bloat, no confusion—just tools that actually help.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="bg-card border border-border rounded-2xl p-6 hover:border-sage/50 hover:shadow-lg transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-sage/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-sage" />
                </div>
                <h3 className="font-editorial text-lg text-foreground mb-2 tracking-editorial">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Quick */}
      <section className="py-20 bg-card">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <p className="label-caps text-terracotta mb-4">Common Questions</p>
              <h2 className="font-editorial text-3xl text-foreground tracking-editorial">
                You might be wondering...
              </h2>
            </div>

            <div className="space-y-6">
              {[
                {
                  q: 'Is it really free?',
                  a: 'Yes. The family plan is free forever. No credit card required, no hidden fees, no "premium" features locked away.',
                },
                {
                  q: 'Is my data safe?',
                  a: 'Absolutely. We use bank-level encryption and never sell or share your data. Your circle is completely private.',
                },
                {
                  q: 'Can my parents use it?',
                  a: 'We designed CareCircle to be simple enough for anyone. Large text, clear buttons, no confusing jargon.',
                },
                {
                  q: 'What if someone doesn\'t have a smartphone?',
                  a: 'CareCircle works on any device with a web browser—phones, tablets, computers. We also offer email notifications.',
                },
              ].map((faq, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-background border border-border rounded-xl p-6"
                >
                  <h3 className="font-medium text-foreground mb-2">{faq.q}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{faq.a}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-foreground text-background">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center">
            <Clock className="w-10 h-10 text-sage mx-auto mb-6" />
            <h2 className="font-editorial text-3xl md:text-4xl lg:text-5xl text-background tracking-editorial mb-6">
              Ready to bring your care team together?
            </h2>
            <p className="text-background/70 text-lg mb-10">
              Join families nationwide who've found peace of mind with CareCircle.
            </p>
            <Link href="/register">
              <Button size="xl" className="bg-sage text-sage-900 hover:bg-sage/90 font-semibold">
                Create your free circle
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
