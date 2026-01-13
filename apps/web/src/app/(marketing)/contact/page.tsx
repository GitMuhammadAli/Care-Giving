'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Mail, MessageSquare, HelpCircle, X } from 'lucide-react';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: 'General question',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSubmitting(false);
    setFormData({ name: '', email: '', subject: 'General question', message: '' });
    setSubmitted(true);
  };

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
                Contact
              </motion.p>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="font-editorial text-4xl md:text-5xl lg:text-6xl text-foreground leading-[1.1] tracking-editorial mb-8"
              >
                We&apos;re here to{' '}
                <em className="not-italic text-sage">help</em>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-muted-foreground text-xl leading-relaxed"
              >
                Questions? Feedback? Need assistance? Reach out to our team.
                We respond to every message personally.
              </motion.p>
            </div>
          </div>
        </section>

        {/* Contact Options */}
        <section className="py-24 bg-stone texture-paper">
          <div className="container mx-auto px-6">
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-background p-10 border border-border text-center"
              >
                <Mail className="w-8 h-8 text-sage mx-auto mb-6" strokeWidth={1.5} />
                <h3 className="font-editorial text-xl text-foreground mb-3">Email Us</h3>
                <p className="text-muted-foreground text-sm mb-6">
                  For general inquiries and support
                </p>
                <a
                  href="mailto:hello@carecircle.app"
                  className="text-foreground hover:text-sage transition-colors"
                >
                  hello@carecircle.app
                </a>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="bg-background p-10 border border-border text-center"
              >
                <MessageSquare className="w-8 h-8 text-sage mx-auto mb-6" strokeWidth={1.5} />
                <h3 className="font-editorial text-xl text-foreground mb-3">Live Chat</h3>
                <p className="text-muted-foreground text-sm mb-6">
                  Available Monday–Friday, 9am–5pm PT
                </p>
                <button
                  onClick={() => setChatOpen(true)}
                  className="text-foreground hover:text-sage transition-colors"
                >
                  Start a conversation
                </button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="bg-background p-10 border border-border text-center"
              >
                <HelpCircle className="w-8 h-8 text-sage mx-auto mb-6" strokeWidth={1.5} />
                <h3 className="font-editorial text-xl text-foreground mb-3">Help Center</h3>
                <p className="text-muted-foreground text-sm mb-6">
                  Guides, tutorials, and FAQs
                </p>
                <Link href="/how-it-works" className="text-foreground hover:text-sage transition-colors">
                  Browse articles
                </Link>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Contact Form */}
        <section className="py-24 texture-paper">
          <div className="container mx-auto px-6">
            <div className="max-w-xl mx-auto">
              <p className="label-caps text-slate mb-6">Send a Message</p>
              <h2 className="font-editorial text-3xl text-foreground tracking-editorial mb-8">
                How can we help?
              </h2>

              {submitted ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-8 border border-sage bg-sage/10 text-center"
                >
                  <p className="text-foreground font-medium mb-2">Message sent!</p>
                  <p className="text-muted-foreground">
                    We&apos;ll get back to you within 24 hours.
                  </p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="label-caps text-muted-foreground block mb-2">Name</label>
                      <Input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="label-caps text-muted-foreground block mb-2">Email</label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label-caps text-muted-foreground block mb-2">Subject</label>
                    <select
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full px-4 py-3 border border-border bg-background text-foreground text-sm focus:outline-none focus:border-sage rounded-md"
                    >
                      <option>General question</option>
                      <option>Technical support</option>
                      <option>Feedback</option>
                      <option>Partnership inquiry</option>
                      <option>Press inquiry</option>
                    </select>
                  </div>

                  <div>
                    <label className="label-caps text-muted-foreground block mb-2">Message</label>
                    <Textarea
                      rows={6}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    variant="editorial"
                    size="lg"
                    fullWidth
                    isLoading={isSubmitting}
                  >
                    Send message
                  </Button>
                </form>
              )}
            </div>
          </div>
        </section>

        {/* Location */}
        <section className="py-24 bg-stone texture-paper">
          <div className="container mx-auto px-6">
            <div className="max-w-2xl mx-auto text-center">
              <p className="label-caps text-slate mb-6">Our Home</p>
              <p className="font-editorial text-2xl text-foreground mb-2">
                San Francisco, California
              </p>
              <p className="text-muted-foreground">
                We&apos;re a small, fully remote team spread across the United States.
              </p>
            </div>
          </div>
        </section>

        {/* Chat Widget */}
        {chatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-6 right-6 w-80 bg-card border border-border rounded-xl shadow-xl z-50"
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-sage/20 rounded-full flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-sage" />
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm">Live Chat</p>
                  <p className="text-xs text-muted-foreground">We typically reply in minutes</p>
                </div>
              </div>
              <button
                onClick={() => setChatOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 h-64 flex items-center justify-center text-muted-foreground text-sm">
              A team member will be with you shortly...
            </div>
            <div className="p-4 border-t border-border">
              <input
                type="text"
                placeholder="Type your message..."
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:border-sage"
              />
            </div>
          </motion.div>
        )}
      </main>
      <Footer />
    </div>
  );
}
