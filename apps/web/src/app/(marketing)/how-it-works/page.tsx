'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { Users, MessageSquare, Calendar, Heart, Shield, Clock } from 'lucide-react';

const features = [
  {
    icon: Users,
    title: "Build Your Circle",
    description: "Invite family members, friends, neighbors, and care professionals. Everyone who helps has a place.",
  },
  {
    icon: MessageSquare,
    title: "Share Updates",
    description: "Post updates about your loved one's day. No more repeating the same information to different people.",
  },
  {
    icon: Calendar,
    title: "Coordinate Visits",
    description: "See who's visiting when. Avoid overlaps. Ensure no one is alone when they shouldn't be.",
  },
  {
    icon: Heart,
    title: "Track Wellbeing",
    description: "Log medications, appointments, and mood. Build a picture of health over time.",
  },
  {
    icon: Shield,
    title: "Stay Private",
    description: "Everything is encrypted. Only your circle can see your updates. No data is ever sold.",
  },
  {
    icon: Clock,
    title: "Remember Together",
    description: "Every update becomes part of your family's story. A timeline of care, preserved.",
  },
];

const steps = [
  {
    number: "01",
    title: "Create your circle",
    description: "Name it after your loved one. Upload a photo if you'd like. The whole process takes less than a minute.",
    detail: "Your circle is completely private. Only people you invite can see anything.",
  },
  {
    number: "02",
    title: "Invite your care team",
    description: "Share a simple link via text, email, or however you communicate. Anyone can join—siblings, spouses, nurses, neighbors.",
    detail: "Different roles can have different permissions. You control who sees what.",
  },
  {
    number: "03",
    title: "Start sharing",
    description: "Post your first update. It could be a medical note, a good day, a small victory, or a request for help.",
    detail: "Everyone in the circle gets notified. No more repeating yourself.",
  },
  {
    number: "04",
    title: "Coordinate care",
    description: "Add tasks, schedule visits, track medications. See who's doing what and when.",
    detail: "The calendar keeps everyone aligned. No more double-booking or gaps.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        {/* Hero */}
        <section className="py-24 texture-paper">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl">
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="label-caps text-slate mb-6"
              >
                How It Works
              </motion.p>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="font-editorial text-4xl md:text-5xl lg:text-6xl text-foreground leading-[1.1] tracking-editorial mb-8"
              >
                Simple tools for{" "}
                <em className="not-italic text-sage">complex</em> care
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-muted-foreground text-xl leading-relaxed"
              >
                CareCircle brings your care team together in one private space.
                Here&apos;s how families use it every day.
              </motion.p>
            </div>
          </div>
        </section>

        {/* Steps */}
        <section className="py-24 bg-stone texture-paper">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <div className="space-y-0 border-t border-border">
                {steps.map((step, index) => (
                  <motion.div
                    key={step.number}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="grid md:grid-cols-12 gap-6 py-12 border-b border-border"
                  >
                    <div className="md:col-span-1">
                      <p className="label-caps text-terracotta">{step.number}</p>
                    </div>
                    <div className="md:col-span-4">
                      <h3 className="font-editorial text-2xl text-foreground tracking-editorial mb-2">
                        {step.title}
                      </h3>
                    </div>
                    <div className="md:col-span-6 md:col-start-7">
                      <p className="text-foreground leading-relaxed text-lg mb-3">
                        {step.description}
                      </p>
                      <p className="text-muted-foreground text-sm">
                        {step.detail}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Features grid */}
        <section className="py-24 texture-paper">
          <div className="container mx-auto px-6">
            <p className="label-caps text-slate mb-6">Features</p>
            <h2 className="font-editorial text-3xl md:text-4xl text-foreground tracking-editorial mb-16 max-w-xl">
              Everything you need, nothing you don&apos;t
            </h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
              {features.map((feature) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  className="bg-background p-10 group hover:bg-accent/30 transition-colors duration-500"
                >
                  <feature.icon className="w-6 h-6 text-sage mb-6" strokeWidth={1.5} />
                  <h3 className="font-editorial text-xl text-foreground mb-3 tracking-editorial">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 bg-stone texture-paper">
          <div className="container mx-auto px-6">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="font-editorial text-3xl md:text-4xl text-foreground tracking-editorial mb-6">
                Ready to bring your care team together?
              </h2>
              <p className="text-muted-foreground text-lg mb-8">
                It takes less than a minute to create your first circle.
              </p>
              <Link href="/register">
                <Button variant="editorial" size="lg">
                  Get started free
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
