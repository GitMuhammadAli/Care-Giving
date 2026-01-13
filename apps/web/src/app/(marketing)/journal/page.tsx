'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { journalEntries } from '@/data/caregivers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const additionalEntries = [
  {
    id: 4,
    title: "Building a Care Team That Works",
    excerpt: "The best care circles include more than just family. How to identify and invite the right people.",
    date: "November 22, 2024",
    readTime: "7 min read",
    category: "Guidance",
  },
  {
    id: 5,
    title: "Self-Care for Caregivers",
    excerpt: "You can't pour from an empty cup. Research-backed strategies for maintaining your own wellbeing.",
    date: "November 15, 2024",
    readTime: "5 min read",
    category: "Wellness",
  },
  {
    id: 6,
    title: "Navigating Difficult Conversations",
    excerpt: "How to talk about end-of-life care, finances, and transitions with grace and clarity.",
    date: "November 8, 2024",
    readTime: "8 min read",
    category: "Guidance",
  },
];

const allEntries = [...journalEntries, ...additionalEntries];

export default function JournalPage() {
  const [email, setEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [subscribed, setSubscribed] = useState(false);

  const featured = allEntries[0];
  const rest = allEntries.slice(1);

  const categorySet = new Set(allEntries.map((e) => e.category));
  const categories: string[] = [];
  categorySet.forEach((cat) => categories.push(cat));

  const filteredEntries = selectedCategory
    ? rest.filter((e) => e.category === selectedCategory)
    : rest;

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubscribing(true);

    // Simulate subscription
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSubscribing(false);
    setEmail('');
    setSubscribed(true);
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
                Journal
              </motion.p>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="font-editorial text-4xl md:text-5xl lg:text-6xl text-foreground leading-[1.1] tracking-editorial mb-8"
              >
                Thoughts on{" "}
                <em className="not-italic text-sage">caring well</em>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-muted-foreground text-xl leading-relaxed"
              >
                Essays, guides, and reflections on the art and practice of caregiving.
                Written with care, for caregivers.
              </motion.p>
            </div>
          </div>
        </section>

        {/* Featured Article */}
        <section className="py-12 bg-stone texture-paper">
          <div className="container mx-auto px-6">
            <article className="grid lg:grid-cols-2 gap-12 items-center cursor-pointer group">
              <div className="aspect-[4/3] bg-sage/20 border border-border group-hover:border-sage/50 transition-colors" />
              <div>
                <p className="label-caps text-terracotta mb-4">{featured.category}</p>
                <h2 className="font-editorial text-3xl md:text-4xl text-foreground tracking-editorial mb-4 group-hover:text-sage transition-colors">
                  {featured.title}
                </h2>
                <p className="text-muted-foreground text-lg leading-relaxed mb-6">
                  {featured.excerpt}
                </p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{featured.date}</span>
                  <span>·</span>
                  <span>{featured.readTime}</span>
                </div>
              </div>
            </article>
          </div>
        </section>

        {/* Category Filter */}
        <section className="py-8 texture-paper border-b border-border">
          <div className="container mx-auto px-6">
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-4 py-2 text-sm rounded-full border transition-colors ${
                  selectedCategory === null
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-border hover:border-foreground'
                }`}
              >
                All Articles
              </button>
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 text-sm rounded-full border transition-colors ${
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

        {/* Article Grid */}
        <section className="py-24 texture-paper">
          <div className="container mx-auto px-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredEntries.map((entry, index) => (
                <motion.article
                  key={entry.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="group cursor-pointer"
                >
                  <div className="aspect-[3/2] bg-stone border border-border mb-6 group-hover:border-sage/50 transition-colors" />
                  <p className="label-caps text-terracotta mb-3">{entry.category}</p>
                  <h3 className="font-editorial text-xl text-foreground tracking-editorial mb-3 group-hover:text-sage transition-colors">
                    {entry.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed mb-4">{entry.excerpt}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{entry.date}</span>
                    <span>·</span>
                    <span>{entry.readTime}</span>
                  </div>
                </motion.article>
              ))}
            </div>

            {filteredEntries.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No articles found in this category.</p>
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="mt-4 text-sage hover:text-sage/80 transition-colors"
                >
                  View all articles
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Newsletter */}
        <section className="py-24 bg-stone texture-paper">
          <div className="container mx-auto px-6">
            <div className="max-w-xl mx-auto text-center">
              <p className="label-caps text-slate mb-6">Newsletter</p>
              <h2 className="font-editorial text-3xl text-foreground tracking-editorial mb-4">
                Monthly reflections on caregiving
              </h2>
              <p className="text-muted-foreground mb-8">
                One email per month. Thoughtful essays, practical guides, and community updates.
                Unsubscribe anytime.
              </p>
              {subscribed ? (
                <p className="text-sage font-medium">
                  You&apos;re subscribed! Check your inbox for a welcome email.
                </p>
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
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
