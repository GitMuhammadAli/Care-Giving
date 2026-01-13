'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { pricingPlans, faqItems } from '@/data/caregivers';
import { Check } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        {/* Hero */}
        <section className="py-24 texture-paper">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto text-center">
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="label-caps text-slate mb-6"
              >
                Pricing
              </motion.p>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="font-editorial text-4xl md:text-5xl lg:text-6xl text-foreground leading-[1.1] tracking-editorial mb-8"
              >
                Care shouldn&apos;t have a{" "}
                <em className="not-italic text-sage">price tag</em>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-muted-foreground text-xl leading-relaxed"
              >
                CareCircle is free for families. Always has been, always will be.
                We offer a professional tier for care managers who work with multiple families.
              </motion.p>
            </div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="py-24 bg-stone texture-paper">
          <div className="container mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {pricingPlans.map((plan, index) => (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-10 border ${
                    plan.highlighted
                      ? 'bg-background border-sage'
                      : 'bg-background border-border'
                  }`}
                >
                  <p className="label-caps text-slate mb-2">{plan.name}</p>
                  <div className="mb-4">
                    <span className="font-editorial text-4xl text-foreground">{plan.price}</span>
                    {plan.price !== 'Free' && (
                      <span className="text-muted-foreground ml-1">/month</span>
                    )}
                  </div>
                  <p className="text-muted-foreground mb-8">{plan.description}</p>

                  <ul className="space-y-4 mb-10">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-sage shrink-0 mt-0.5" />
                        <span className="text-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Link href={plan.highlighted ? '/register' : '/contact'}>
                    <Button
                      variant={plan.highlighted ? 'editorial' : 'editorial-outline'}
                      className="w-full"
                      size="lg"
                    >
                      {plan.highlighted ? 'Get started free' : 'Contact us'}
                    </Button>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-24 texture-paper">
          <div className="container mx-auto px-6">
            <div className="max-w-2xl mx-auto">
              <p className="label-caps text-slate mb-6">FAQ</p>
              <h2 className="font-editorial text-3xl md:text-4xl text-foreground tracking-editorial mb-12">
                Common questions
              </h2>

              <Accordion type="single" collapsible className="space-y-0">
                {faqItems.map((item, index) => (
                  <AccordionItem
                    key={index}
                    value={`item-${index}`}
                    className="border-b border-border py-2"
                  >
                    <AccordionTrigger className="text-left font-editorial text-lg text-foreground hover:no-underline py-6">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground leading-relaxed pb-6">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>

        {/* Guarantee */}
        <section className="py-24 bg-stone texture-paper">
          <div className="container mx-auto px-6">
            <div className="max-w-2xl mx-auto text-center">
              <p className="label-caps text-slate mb-6">Our Promise</p>
              <h2 className="font-editorial text-3xl md:text-4xl text-foreground tracking-editorial mb-6">
                Free means free
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed">
                We will never put core features behind a paywall. We will never show you ads.
                We will never sell your data. CareCircle is funded by our Professional tier
                and by families who choose to support us. The Family plan will remain free forever.
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
