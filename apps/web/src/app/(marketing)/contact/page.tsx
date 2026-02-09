'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ComingSoonBadge, BetaBadge } from '@/components/ui/coming-soon-badge';
import {
  Mail,
  MessageSquare,
  HelpCircle,
  MapPin,
  Clock,
  Send,
  CheckCircle2,
  X,
  ArrowRight,
  Info,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const contactOptions = [
  {
    icon: Mail,
    title: 'Email Us',
    description: 'For general inquiries and support',
    action: 'hello@carecircle.app',
    actionType: 'email',
    comingSoon: false,
  },
  {
    icon: MessageSquare,
    title: 'Live Chat',
    description: 'Real-time support with our team',
    action: 'Coming Soon',
    actionType: 'chat',
    comingSoon: true,
  },
  {
    icon: HelpCircle,
    title: 'Help Center',
    description: 'Guides, tutorials, and FAQs',
    action: 'Browse articles',
    actionType: 'link',
    link: '/how-it-works',
    comingSoon: false,
  },
];

const responseTime = [
  { type: 'Email', time: 'Within 24–48 hours' },
  { type: 'Help Center', time: 'Instant access' },
];

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
    
    // Show informational toast about beta status
    toast.success(
      'Message received! This is a demo - in production, your message would be sent to our team.',
      { duration: 5000, icon: '📬' }
    );
  };

  const handleChatClick = () => {
    toast('Live chat is coming soon! For now, please use email or our contact form.', {
      duration: 4000,
      icon: '💬',
    });
  };

  return (
    <>
      {/* Hero */}
      <section className="py-20 md:py-28 texture-paper">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 mb-6"
              >
                <MessageSquare className="w-5 h-5 text-sage" />
                <span className="label-caps text-sage-600">Get In Touch</span>
                <BetaBadge size="sm" className="ml-2" />
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="font-editorial text-4xl md:text-5xl lg:text-6xl text-foreground leading-[1.05] tracking-editorial mb-8"
              >
                We're here to{' '}
                <em className="not-italic text-sage">help</em>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-xl text-muted-foreground leading-relaxed mb-10"
              >
                Questions? Feedback? Need assistance? We read every message 
                and respond as quickly as we can.
              </motion.p>

              {/* Contact Options */}
              <div className="space-y-4">
                {contactOptions.map((option, index) => (
                  <motion.div
                    key={option.title}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    className={`flex items-start gap-4 p-4 bg-card border border-border rounded-xl transition-colors ${
                      option.comingSoon ? 'opacity-75' : 'hover:border-sage/50'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-sage/10 flex items-center justify-center flex-shrink-0">
                      <option.icon className="w-6 h-6 text-sage" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-foreground">{option.title}</h3>
                        {option.comingSoon && <ComingSoonBadge size="sm" />}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{option.description}</p>
                      {option.actionType === 'email' ? (
                        <a
                          href={`mailto:${option.action}`}
                          className="text-sage hover:text-sage/80 text-sm font-medium transition-colors"
                        >
                          {option.action}
                        </a>
                      ) : option.actionType === 'chat' ? (
                        <button
                          onClick={handleChatClick}
                          className="text-muted-foreground text-sm font-medium cursor-not-allowed"
                        >
                          {option.action}
                        </button>
                      ) : (
                        <Link
                          href={option.link || '#'}
                          className="text-sage hover:text-sage/80 text-sm font-medium transition-colors"
                        >
                          {option.action} →
                        </Link>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-card border border-border rounded-2xl p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Send className="w-5 h-5 text-terracotta" />
                  <span className="label-caps text-terracotta">Send a Message</span>
                </div>
                <BetaBadge size="sm" variant="subtle" />
              </div>

              {/* Beta Notice */}
              <div className="flex items-start gap-3 p-3 mb-6 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  This is a demo contact form. In the full release, messages will be sent directly to our support team.
                </p>
              </div>

              {submitted ? (
                <div className="py-12 text-center">
                  <CheckCircle2 className="w-12 h-12 text-sage mx-auto mb-4" />
                  <h3 className="font-editorial text-2xl text-foreground mb-2">Message sent!</h3>
                  <p className="text-muted-foreground">
                    Thanks for reaching out. We'll get back to you soon.
                  </p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="mt-4 text-sage hover:text-sage/80 text-sm font-medium"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid md:grid-cols-2 gap-5">
                    <div>
                      <label className="text-sm text-muted-foreground block mb-2">Name <span className="text-destructive">*</span></label>
                      <Input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Your name"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground block mb-2">Email <span className="text-destructive">*</span></label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="you@example.com"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-muted-foreground block mb-2">Subject</label>
                    <select
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full px-4 py-3 border border-border bg-background text-foreground text-sm focus:outline-none focus:border-sage rounded-lg"
                    >
                      <option>General question</option>
                      <option>Technical support</option>
                      <option>Feedback or suggestion</option>
                      <option>Partnership inquiry</option>
                      <option>Press inquiry</option>
                      <option>Something else</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm text-muted-foreground block mb-2">Message <span className="text-destructive">*</span></label>
                    <Textarea
                      rows={5}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="How can we help you?"
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
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </form>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Response Times */}
      <section className="py-16 bg-card border-y border-border">
        <div className="container mx-auto px-6">
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16">
            {responseTime.map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-sage" />
                <div>
                  <p className="text-sm font-medium text-foreground">{item.type}</p>
                  <p className="text-xs text-muted-foreground">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Location */}
      <section className="py-20 texture-paper">
        <div className="container mx-auto px-6">
          <div className="max-w-2xl mx-auto text-center">
            <MapPin className="w-10 h-10 text-terracotta mx-auto mb-6" />
            <h2 className="font-editorial text-3xl text-foreground tracking-editorial mb-4">
              Where we're based
            </h2>
            <p className="text-muted-foreground mb-2">
              <strong className="text-foreground">San Francisco, California</strong>
            </p>
            <p className="text-muted-foreground">
              We're a small, fully remote team spread across the United States, 
              united by our mission to make caregiving easier.
            </p>
          </div>
        </div>
      </section>

      {/* Chat Widget - Disabled/Coming Soon */}
      {chatOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="fixed bottom-6 right-6 w-80 bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden"
        >
          <div className="flex items-center justify-between p-4 border-b border-border bg-sage/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-sage/20 rounded-full flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-sage" />
              </div>
              <div>
                <p className="font-medium text-foreground text-sm">CareCircle Support</p>
                <ComingSoonBadge size="sm" />
              </div>
            </div>
            <button
              onClick={() => setChatOpen(false)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4 h-64 flex flex-col items-center justify-center text-center">
            <MessageSquare className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="font-medium text-foreground mb-2">Live Chat Coming Soon</h3>
            <p className="text-sm text-muted-foreground">
              We're working on bringing real-time support. For now, please email us at{' '}
              <a href="mailto:hello@carecircle.app" className="text-sage hover:underline">
                hello@carecircle.app
              </a>
            </p>
          </div>
        </motion.div>
      )}
    </>
  );
}
