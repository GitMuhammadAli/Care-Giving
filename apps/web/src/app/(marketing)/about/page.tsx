'use client';

import { motion } from 'framer-motion';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { teamMembers } from '@/data/caregivers';

const values = [
  {
    title: "Privacy First",
    description: "Your family's story is yours alone. We never sell data, show ads, or share your information.",
  },
  {
    title: "Simplicity",
    description: "Caregiving is complex enough. Our tools are intentionally simple, focused, and calm.",
  },
  {
    title: "Accessibility",
    description: "Care coordination should be free. We're committed to keeping CareCircle accessible to all.",
  },
];

export default function AboutPage() {
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
                About Us
              </motion.p>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="font-editorial text-4xl md:text-5xl lg:text-6xl text-foreground leading-[1.1] tracking-editorial mb-8"
              >
                Built by caregivers,{" "}
                <em className="not-italic text-sage">for caregivers</em>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-muted-foreground text-xl leading-relaxed"
              >
                CareCircle was born from personal experience. We know what it&apos;s like to
                coordinate care across distances, juggle responsibilities, and feel the
                weight of loving someone through their hardest days.
              </motion.p>
            </div>
          </div>
        </section>

        {/* Mission */}
        <section className="py-24 bg-stone texture-paper">
          <div className="container mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-16">
              <div>
                <p className="label-caps text-slate mb-6">Our Mission</p>
                <h2 className="font-editorial text-3xl md:text-4xl text-foreground leading-tight tracking-editorial mb-6">
                  To make caregiving a shared journey, not a solitary burden
                </h2>
              </div>
              <div className="flex items-end">
                <p className="text-muted-foreground text-lg leading-relaxed">
                  We believe that when families can coordinate with ease, communicate with
                  clarity, and support each other without friction, the quality of care
                  improves—and so does the wellbeing of everyone involved.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="py-24 texture-paper">
          <div className="container mx-auto px-6">
            <p className="label-caps text-slate mb-12">Our Values</p>
            <div className="grid md:grid-cols-3 gap-px bg-border">
              {values.map((value) => (
                <motion.div
                  key={value.title}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  className="bg-background p-10"
                >
                  <h3 className="font-editorial text-xl text-foreground mb-4 tracking-editorial">
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
        <section className="py-24 bg-stone texture-paper">
          <div className="container mx-auto px-6">
            <p className="label-caps text-slate mb-6">Our Team</p>
            <h2 className="font-editorial text-3xl md:text-4xl text-foreground tracking-editorial mb-16 max-w-xl">
              People who understand the weight—and the privilege—of caring
            </h2>

            <div className="grid md:grid-cols-3 gap-8">
              {teamMembers.map((member) => (
                <motion.div
                  key={member.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="border-t border-border pt-8"
                >
                  <div className="w-20 h-20 rounded-full bg-sage/30 mb-6" />
                  <h3 className="font-editorial text-xl text-foreground mb-1">{member.name}</h3>
                  <p className="label-caps text-slate text-[10px] mb-4">{member.role}</p>
                  <p className="text-muted-foreground text-sm leading-relaxed">{member.bio}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
