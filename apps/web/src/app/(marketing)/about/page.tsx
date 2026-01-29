'use client';

import { motion } from 'framer-motion';
import { Heart, Shield, Sparkles, Users, Target, Lightbulb } from 'lucide-react';

const values = [
  {
    icon: Shield,
    title: 'Privacy First',
    description: "Your family's story is yours alone. We never sell data, show ads, or share your information with anyone.",
    color: 'sage',
  },
  {
    icon: Sparkles,
    title: 'Radical Simplicity',
    description: 'Caregiving is hard enough. Our tools are intentionally simple—no learning curve, no feature bloat.',
    color: 'terracotta',
  },
  {
    icon: Heart,
    title: 'Free Forever',
    description: 'Care coordination should never have a price tag. The family plan will always be free.',
    color: 'sage',
  },
];

const team = [
  {
    name: 'Sarah Chen',
    role: 'Founder & CEO',
    bio: "Cared for her grandmother through Alzheimer's. Built CareCircle when she realized how broken family coordination was.",
    avatar: 'SC',
  },
  {
    name: 'Michael Torres',
    role: 'Head of Product',
    bio: "Former hospice volunteer. Believes technology should reduce friction, not add to it.",
    avatar: 'MT',
  },
  {
    name: 'Dr. Emily Walsh',
    role: 'Care Advisor',
    bio: "Geriatrician with 20 years of experience. Ensures CareCircle reflects real caregiving needs.",
    avatar: 'EW',
  },
];

const stats = [
  { value: '53M', label: 'Americans are caregivers' },
  { value: '24%', label: 'Care for 2+ people' },
  { value: '60%', label: 'Also work full-time' },
];

export default function AboutPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="py-20 md:py-28 texture-paper">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 mb-6"
            >
              <Heart className="w-5 h-5 text-sage fill-sage/30" />
              <span className="label-caps text-sage-600">Our Story</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="font-editorial text-4xl md:text-5xl lg:text-6xl text-foreground leading-[1.05] tracking-editorial mb-8"
            >
              Built by caregivers who{' '}
              <em className="not-italic text-sage">understood the struggle</em>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl text-muted-foreground leading-relaxed max-w-2xl"
            >
              CareCircle was born from personal experience. We know what it's like to 
              coordinate care across distances, juggle responsibilities, and feel the 
              weight of loving someone through their hardest days.
            </motion.p>
          </div>
        </div>
      </section>

      {/* The Problem We Saw */}
      <section className="py-20 bg-card">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="label-caps text-terracotta mb-4">The Problem</p>
              <h2 className="font-editorial text-3xl md:text-4xl text-foreground tracking-editorial mb-6">
                Caregiving was already hard.{' '}
                <span className="text-muted-foreground">Coordination made it harder.</span>
              </h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  When our founder's grandmother was diagnosed with Alzheimer's, 
                  the family scattered across four states suddenly needed to become a team.
                </p>
                <p>
                  What followed was chaos: endless group texts, missed medications, 
                  duplicated effort, and the constant feeling that someone was always 
                  out of the loop.
                </p>
                <p className="text-foreground font-medium">
                  There had to be a better way.
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="bg-background border border-border rounded-2xl p-8 md:p-10">
              <p className="label-caps text-sage-600 mb-8">The Reality of Caregiving</p>
              <div className="space-y-8">
                {stats.map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className={index > 0 ? 'pt-8 border-t border-border' : ''}
                  >
                    <p className="font-editorial text-4xl md:text-5xl text-foreground mb-2">
                      {stat.value}
                    </p>
                    <p className="text-muted-foreground">{stat.label}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Mission */}
      <section className="py-20 texture-paper">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex items-center justify-center gap-2 mb-6"
            >
              <Target className="w-5 h-5 text-terracotta" />
              <span className="label-caps text-terracotta">Our Mission</span>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="font-editorial text-3xl md:text-4xl lg:text-5xl text-foreground tracking-editorial mb-8"
            >
              To make caregiving a{' '}
              <em className="not-italic text-sage">shared journey</em>,{' '}
              not a solitary burden
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-xl text-muted-foreground leading-relaxed"
            >
              We believe that when families can coordinate with ease, communicate with 
              clarity, and support each other without friction, the quality of care 
              improves—and so does the wellbeing of everyone involved.
            </motion.p>
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="py-20 bg-card">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <p className="label-caps text-sage-600 mb-4">What We Stand For</p>
            <h2 className="font-editorial text-3xl md:text-4xl text-foreground tracking-editorial">
              Our Values
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {values.map((value, index) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-background border border-border rounded-2xl p-8 text-center hover:border-sage/50 transition-colors"
              >
                <div className={`w-14 h-14 rounded-xl ${
                  value.color === 'sage' ? 'bg-sage/10' : 'bg-terracotta/10'
                } flex items-center justify-center mx-auto mb-6`}>
                  <value.icon className={`w-7 h-7 ${
                    value.color === 'sage' ? 'text-sage' : 'text-terracotta'
                  }`} />
                </div>
                <h3 className="font-editorial text-xl text-foreground mb-3 tracking-editorial">
                  {value.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {value.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20 texture-paper">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Users className="w-5 h-5 text-terracotta" />
              <span className="label-caps text-terracotta">The Team</span>
            </div>
            <h2 className="font-editorial text-3xl md:text-4xl text-foreground tracking-editorial mb-4">
              People who get it
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Every person on our team has been touched by caregiving. 
              We build what we wish we had.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {team.map((member, index) => (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-sage/40 to-sage/20 flex items-center justify-center mx-auto mb-6 text-sage-700 font-editorial text-2xl">
                  {member.avatar}
                </div>
                <h3 className="font-editorial text-xl text-foreground mb-1">
                  {member.name}
                </h3>
                <p className="label-caps text-sage-600 text-xs mb-4">{member.role}</p>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {member.bio}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Join Us CTA */}
      <section className="py-20 bg-foreground text-background">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center">
            <Lightbulb className="w-10 h-10 text-sage mx-auto mb-6" />
            <h2 className="font-editorial text-3xl md:text-4xl text-background tracking-editorial mb-6">
              Want to join our mission?
            </h2>
            <p className="text-background/70 text-lg mb-8">
              We're always looking for passionate people who understand caregiving 
              and want to make a difference.
            </p>
            <a
              href="mailto:careers@carecircle.app"
              className="inline-flex items-center gap-2 bg-sage text-sage-900 px-6 py-3 rounded-lg font-medium hover:bg-sage/90 transition-colors"
            >
              View Open Positions
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
