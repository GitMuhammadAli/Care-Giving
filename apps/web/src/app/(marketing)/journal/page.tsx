'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BookOpen, Clock, ArrowRight, Mail, Tag } from 'lucide-react';

const articles = [
  {
    id: 1,
    title: 'The Art of Asking for Help',
    excerpt: 'Why caregivers struggle to accept support, and how to build a care team that actually works.',
    date: 'January 15, 2026',
    readTime: '6 min read',
    category: 'Guidance',
    featured: true,
  },
  {
    id: 2,
    title: 'When Siblings Disagree About Care',
    excerpt: 'Navigating family conflict during caregiving—with empathy and boundaries.',
    date: 'January 8, 2026',
    readTime: '8 min read',
    category: 'Family',
  },
  {
    id: 3,
    title: 'Self-Care Isn\'t Selfish',
    excerpt: 'Research-backed strategies for maintaining your own wellbeing while caring for others.',
    date: 'January 1, 2026',
    readTime: '5 min read',
    category: 'Wellness',
  },
  {
    id: 4,
    title: 'Building a Care Team That Works',
    excerpt: 'The best care circles include more than just family. How to identify and invite the right people.',
    date: 'December 22, 2025',
    readTime: '7 min read',
    category: 'Guidance',
  },
  {
    id: 5,
    title: 'The Long Goodbye: Caring Through Dementia',
    excerpt: 'Finding moments of connection when memory fades—stories from caregivers who\'ve been there.',
    date: 'December 15, 2025',
    readTime: '10 min read',
    category: 'Stories',
  },
  {
    id: 6,
    title: 'Navigating Difficult Conversations',
    excerpt: 'How to talk about end-of-life care, finances, and transitions with grace and clarity.',
    date: 'December 8, 2025',
    readTime: '8 min read',
    category: 'Guidance',
  },
  {
    id: 7,
    title: 'Technology for the Reluctant',
    excerpt: 'How to help older family members embrace digital tools without frustration.',
    date: 'December 1, 2025',
    readTime: '5 min read',
    category: 'Tips',
  },
  {
    id: 8,
    title: 'The Gift of Presence',
    excerpt: 'Why just being there matters more than doing everything perfectly.',
    date: 'November 24, 2025',
    readTime: '4 min read',
    category: 'Reflection',
  },
];

const categories = ['All', 'Guidance', 'Family', 'Wellness', 'Stories', 'Tips', 'Reflection'];

export default function JournalPage() {
  const [email, setEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');

  const featured = articles.find((a) => a.featured);
  const filteredArticles = selectedCategory === 'All' 
    ? articles.filter((a) => !a.featured)
    : articles.filter((a) => a.category === selectedCategory && !a.featured);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsSubscribing(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSubscribing(false);
    setEmail('');
    setSubscribed(true);
  };

  return (
    <>
      {/* Hero */}
      <section className="py-20 md:py-28 texture-paper">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 mb-6"
            >
              <BookOpen className="w-5 h-5 text-sage" />
              <span className="label-caps text-sage-600">The CareCircle Journal</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="font-editorial text-4xl md:text-5xl lg:text-6xl text-foreground leading-[1.05] tracking-editorial mb-8"
            >
              Thoughts on{' '}
              <em className="not-italic text-sage">caring well</em>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl text-muted-foreground leading-relaxed"
            >
              Essays, guides, and reflections on the art and practice of caregiving. 
              Written with care, for caregivers.
            </motion.p>
          </div>
        </div>
      </section>

      {/* Featured Article */}
      {featured && (
        <section className="py-12 bg-card">
          <div className="container mx-auto px-6">
            <motion.article
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-8 items-center cursor-pointer group"
            >
              <div className="aspect-[4/3] bg-gradient-to-br from-sage/20 to-terracotta/10 rounded-2xl border border-border group-hover:border-sage/50 transition-colors flex items-center justify-center">
                <BookOpen className="w-16 h-16 text-sage/40" />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <span className="bg-terracotta/10 text-terracotta text-xs font-medium px-3 py-1 rounded-full">
                    {featured.category}
                  </span>
                  <span className="text-sm text-muted-foreground">Featured</span>
                </div>
                <h2 className="font-editorial text-3xl md:text-4xl text-foreground tracking-editorial mb-4 group-hover:text-sage transition-colors">
                  {featured.title}
                </h2>
                <p className="text-muted-foreground text-lg leading-relaxed mb-6">
                  {featured.excerpt}
                </p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{featured.date}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {featured.readTime}
                  </span>
                </div>
              </div>
            </motion.article>
          </div>
        </section>
      )}

      {/* Category Filter */}
      <section className="py-8 texture-paper border-y border-border sticky top-16 bg-background/95 backdrop-blur-sm z-20">
        <div className="container mx-auto px-6">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <Tag className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 text-sm rounded-full border whitespace-nowrap transition-colors ${
                  selectedCategory === category
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-border hover:border-foreground'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Articles Grid */}
      <section className="py-20 texture-paper">
        <div className="container mx-auto px-6">
          {filteredArticles.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {filteredArticles.map((article, index) => (
                <motion.article
                  key={article.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className="group cursor-pointer"
                >
                  <div className="aspect-[3/2] bg-gradient-to-br from-sage/10 to-terracotta/5 rounded-xl border border-border mb-5 group-hover:border-sage/50 transition-colors flex items-center justify-center">
                    <BookOpen className="w-10 h-10 text-sage/30" />
                  </div>
                  <span className="text-xs font-medium text-terracotta mb-2 block">
                    {article.category}
                  </span>
                  <h3 className="font-editorial text-xl text-foreground tracking-editorial mb-3 group-hover:text-sage transition-colors">
                    {article.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                    {article.excerpt}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{article.date}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {article.readTime}
                    </span>
                  </div>
                </motion.article>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No articles found in this category.</p>
              <button
                onClick={() => setSelectedCategory('All')}
                className="text-sage hover:text-sage/80 transition-colors font-medium"
              >
                View all articles
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-20 bg-card">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-xl mx-auto text-center"
          >
            <Mail className="w-10 h-10 text-sage mx-auto mb-6" />
            <h2 className="font-editorial text-3xl text-foreground tracking-editorial mb-4">
              Monthly reflections on caregiving
            </h2>
            <p className="text-muted-foreground mb-8">
              One email per month. Thoughtful essays, practical guides, and community updates. 
              Unsubscribe anytime.
            </p>

            {subscribed ? (
              <div className="p-6 bg-sage/10 border border-sage/20 rounded-xl">
                <p className="text-sage-700 font-medium">
                  ✓ You're subscribed! Check your inbox for a welcome email.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex gap-3 max-w-md mx-auto">
                <Input
                  type="email"
                  placeholder="Your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1"
                  required
                />
                <Button type="submit" variant="editorial" disabled={isSubscribing}>
                  {isSubscribing ? '...' : 'Subscribe'}
                </Button>
              </form>
            )}
          </motion.div>
        </div>
      </section>
    </>
  );
}
