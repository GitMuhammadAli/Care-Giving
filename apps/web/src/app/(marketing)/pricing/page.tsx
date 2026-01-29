'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Check,
  Heart,
  Shield,
  Sparkles,
  Building2,
  ArrowRight,
  HelpCircle,
  Star,
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const plans = [
  {
    name: 'Family',
    price: 'Free',
    priceDetail: 'forever',
    description: 'Everything families need to coordinate care together.',
    icon: Heart,
    highlighted: true,
    features: [
      'Unlimited care circles',
      'Unlimited family members',
      'Shared timeline & updates',
      'Medication tracking',
      'Visit coordination',
      'Document storage (5GB)',
      'Mobile & web access',
      'Email notifications',
      'Bank-level encryption',
    ],
    cta: 'Get started free',
    ctaLink: '/register',
  },
  {
    name: 'Professional',
    price: '$29',
    priceDetail: '/month',
    description: 'For care managers working with multiple families.',
    icon: Building2,
    highlighted: false,
    features: [
      'Everything in Family, plus:',
      'Manage 10+ family circles',
      'Professional profile',
      'Priority support',
      'Analytics dashboard',
      'Document storage (50GB)',
      'API access',
      'Custom branding',
      'HIPAA BAA available',
    ],
    cta: 'Contact sales',
    ctaLink: '/contact',
  },
];

const faqs = [
  {
    question: 'Is it really free forever?',
    answer: 'Yes. The Family plan is and will always be free. No credit card required, no trial period, no hidden fees. We believe care coordination is a basic need that shouldn\'t have a price tag.',
  },
  {
    question: 'How do you make money then?',
    answer: 'We offer a Professional tier for care managers, geriatric care specialists, and agencies who work with multiple families. We also accept optional donations from families who want to support our mission.',
  },
  {
    question: 'Will you ever put features behind a paywall?',
    answer: 'No. Core caregiving features will always be free. The Professional tier is for additional business tools, not essential care features.',
  },
  {
    question: 'Is my data safe?',
    answer: 'Absolutely. We use bank-level encryption (AES-256), and your data is never sold or shared. For Professional users, we offer HIPAA Business Associate Agreements.',
  },
  {
    question: 'Can I invite professionals to my family circle?',
    answer: 'Yes! You can invite anyone—nurses, aides, neighbors, care managers. They\'ll have access to your circle with the permissions you set.',
  },
  {
    question: 'What happens to my data if I stop using CareCircle?',
    answer: 'Your data is yours. You can export everything at any time. If you delete your account, we permanently remove all your data from our servers.',
  },
];

export default function PricingPage() {
  return (
    <>
      {/* Hero */}
      <section className="py-20 md:py-28 texture-paper">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center gap-2 mb-6"
            >
              <Sparkles className="w-5 h-5 text-sage" />
              <span className="label-caps text-sage-600">Simple Pricing</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="font-editorial text-4xl md:text-5xl lg:text-6xl text-foreground leading-[1.05] tracking-editorial mb-8"
            >
              Care shouldn't have a{' '}
              <em className="not-italic text-sage">price tag</em>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl text-muted-foreground leading-relaxed"
            >
              CareCircle is free for families. Always has been, always will be. 
              We offer a professional tier for care managers working with multiple families.
            </motion.p>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-20 bg-card">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className={`relative rounded-2xl p-8 md:p-10 ${
                  plan.highlighted
                    ? 'bg-background border-2 border-sage shadow-xl'
                    : 'bg-background border border-border'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-sage text-sage-900 text-xs font-semibold px-4 py-1.5 rounded-full">
                    Most Popular
                  </div>
                )}

                <div className="flex items-center gap-3 mb-6">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    plan.highlighted ? 'bg-sage/10' : 'bg-terracotta/10'
                  }`}>
                    <plan.icon className={`w-6 h-6 ${
                      plan.highlighted ? 'text-sage' : 'text-terracotta'
                    }`} />
                  </div>
                  <div>
                    <p className="font-editorial text-xl text-foreground">{plan.name}</p>
                  </div>
                </div>

                <div className="mb-6">
                  <span className="font-editorial text-5xl text-foreground">{plan.price}</span>
                  <span className="text-muted-foreground ml-1">{plan.priceDetail}</span>
                </div>

                <p className="text-muted-foreground mb-8">{plan.description}</p>

                <ul className="space-y-4 mb-10">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className={`w-5 h-5 shrink-0 mt-0.5 ${
                        plan.highlighted ? 'text-sage' : 'text-terracotta'
                      }`} />
                      <span className="text-foreground text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link href={plan.ctaLink}>
                  <Button
                    variant={plan.highlighted ? 'editorial' : 'editorial-outline'}
                    size="lg"
                    fullWidth
                  >
                    {plan.cta}
                    {plan.highlighted && <ArrowRight className="w-4 h-4 ml-2" />}
                  </Button>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-16 texture-paper border-y border-border">
        <div className="container mx-auto px-6">
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16">
            {[
              { icon: Shield, text: 'Bank-level encryption' },
              { icon: Star, text: '4.9 App Store rating' },
              { icon: Heart, text: '50,000+ families' },
            ].map((badge, i) => (
              <div key={i} className="flex items-center gap-3 text-muted-foreground">
                <badge.icon className="w-5 h-5 text-sage" />
                <span className="text-sm">{badge.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-card">
        <div className="container mx-auto px-6">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-12">
              <div className="flex items-center justify-center gap-2 mb-4">
                <HelpCircle className="w-5 h-5 text-terracotta" />
                <span className="label-caps text-terracotta">FAQ</span>
              </div>
              <h2 className="font-editorial text-3xl md:text-4xl text-foreground tracking-editorial">
                Common questions
              </h2>
            </div>

            <Accordion type="single" collapsible className="space-y-0">
              {faqs.map((faq, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className="border-b border-border py-2"
                >
                  <AccordionTrigger className="text-left font-editorial text-lg text-foreground hover:no-underline py-6">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed pb-6">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* Promise Section */}
      <section className="py-20 texture-paper">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto text-center"
          >
            <Heart className="w-10 h-10 text-sage mx-auto mb-6" />
            <h2 className="font-editorial text-3xl md:text-4xl text-foreground tracking-editorial mb-6">
              Our promise to families
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              We will never put core features behind a paywall. We will never show you ads. 
              We will never sell your data. CareCircle is funded by our Professional tier 
              and by families who choose to support us. <strong className="text-foreground">The Family plan will remain free forever.</strong>
            </p>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-foreground text-background">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="font-editorial text-3xl md:text-4xl lg:text-5xl text-background tracking-editorial mb-6">
              Ready to get started?
            </h2>
            <p className="text-background/70 text-lg mb-10">
              Join 50,000+ families who coordinate care with CareCircle.
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
