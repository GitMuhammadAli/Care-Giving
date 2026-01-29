'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Heart, Quote, Star, ArrowRight, MessageSquare } from 'lucide-react';

const featuredStory = {
  quote: "When Dad was diagnosed, our family scattered across four states suddenly needed to become a team. CareCircle gave us a home base. It's been two years now, and I can't imagine doing this without it.",
  story: "At first, we tried group texts. Then shared spreadsheets. Then a family Facebook group. Nothing worked. Information got lost, people felt left out, and I—as the primary caregiver—was exhausted from being the communication hub.\n\nCareCircle changed everything. Now everyone logs in and sees exactly what's happening. Dad's medications, his good days and bad days, upcoming appointments. My siblings don't have to ask me for updates anymore. They just check the app.\n\nThe guilt has lifted too. Before, I felt like I was the only one carrying the weight. Now I can see that everyone is contributing—even my brother in Seattle who can only visit twice a year. He schedules video calls, sends encouraging notes, and helps research treatment options. CareCircle made his contributions visible.",
  author: 'Jennifer Walsh',
  role: 'Caring for her father with dementia',
  location: 'Portland, OR',
  avatar: 'JW',
  familySize: '4 members',
  duration: '2 years on CareCircle',
};

const stories = [
  {
    quote: "My brothers and I live in different states. CareCircle is how we stay connected to Dad's care without the 'who's doing what' arguments.",
    author: 'Michael Chen',
    role: 'Long-distance caregiver',
    avatar: 'MC',
  },
  {
    quote: "As her hospice nurse, being invited into the family's circle helped me provide better care. I could see the full picture—their observations, their concerns, their love.",
    author: 'Patricia Okonkwo, RN',
    role: 'Hospice care provider',
    avatar: 'PO',
  },
  {
    quote: "My husband has early-onset Alzheimer's. Our three adult children live in different cities. CareCircle became our lifeline.",
    author: 'Linda Yamamoto',
    role: 'Wife & primary caregiver',
    avatar: 'LY',
  },
  {
    quote: "I manage care for eight different families. Before CareCircle, I was drowning in communication channels. Now everything is organized.",
    author: 'James Morrison, GCM',
    role: 'Professional care manager',
    avatar: 'JM',
  },
  {
    quote: "Mom has six children and twelve grandchildren. Coordinating visits was impossible. Now we use the calendar to make sure someone visits every single day.",
    author: 'The Garcia Family',
    role: 'Six siblings coordinating care',
    avatar: 'GF',
  },
  {
    quote: "The medication tracking alone has been worth it. No more 'Did anyone give Mom her pills?' texts at 2am.",
    author: 'Robert & Amy Thompson',
    role: 'Caring for their mother',
    avatar: 'RT',
  },
];

export default function StoriesPage() {
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
              <Heart className="w-5 h-5 text-terracotta fill-terracotta/30" />
              <span className="label-caps text-terracotta">Family Stories</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="font-editorial text-4xl md:text-5xl lg:text-6xl text-foreground leading-[1.05] tracking-editorial mb-8"
            >
              Real families.{' '}
              <em className="not-italic text-sage">Real relief.</em>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl text-muted-foreground leading-relaxed"
            >
              Every caregiving journey is unique. Here are stories from families 
              who found support, coordination, and peace of mind with CareCircle.
            </motion.p>
          </div>
        </div>
      </section>

      {/* Featured Story */}
      <section className="py-20 bg-card">
        <div className="container mx-auto px-6">
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-background border border-border rounded-2xl overflow-hidden"
            >
              <div className="grid lg:grid-cols-3">
                {/* Left - Quote & Info */}
                <div className="lg:col-span-1 bg-sage/5 p-8 md:p-10 border-b lg:border-b-0 lg:border-r border-border">
                  <div className="flex gap-0.5 mb-6">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="w-5 h-5 text-amber-400 fill-amber-400" />
                    ))}
                  </div>
                  
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-sage/40 to-sage/20 flex items-center justify-center text-sage-700 font-editorial text-xl">
                      {featuredStory.avatar}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{featuredStory.author}</p>
                      <p className="text-sm text-muted-foreground">{featuredStory.role}</p>
                    </div>
                  </div>

                  <div className="space-y-4 text-sm">
                    <div className="flex items-center justify-between py-3 border-t border-border">
                      <span className="text-muted-foreground">Location</span>
                      <span className="text-foreground">{featuredStory.location}</span>
                    </div>
                    <div className="flex items-center justify-between py-3 border-t border-border">
                      <span className="text-muted-foreground">Circle size</span>
                      <span className="text-foreground">{featuredStory.familySize}</span>
                    </div>
                    <div className="flex items-center justify-between py-3 border-t border-border">
                      <span className="text-muted-foreground">Using CareCircle</span>
                      <span className="text-foreground">{featuredStory.duration}</span>
                    </div>
                  </div>
                </div>

                {/* Right - Full Story */}
                <div className="lg:col-span-2 p-8 md:p-10">
                  <Quote className="w-10 h-10 text-sage/30 mb-6" />
                  
                  <blockquote className="font-editorial text-2xl md:text-3xl text-foreground leading-snug tracking-editorial mb-8">
                    "{featuredStory.quote}"
                  </blockquote>

                  <div className="prose prose-muted max-w-none">
                    {featuredStory.story.split('\n\n').map((paragraph, i) => (
                      <p key={i} className="text-muted-foreground leading-relaxed mb-4">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* More Stories Grid */}
      <section className="py-20 texture-paper">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <p className="label-caps text-sage-600 mb-4">More Stories</p>
            <h2 className="font-editorial text-3xl md:text-4xl text-foreground tracking-editorial">
              From families like yours
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {stories.map((story, index) => (
              <motion.div
                key={story.author}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="bg-card border border-border rounded-2xl p-6 hover:border-sage/50 transition-colors"
              >
                <div className="flex gap-0.5 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                
                <blockquote className="text-foreground leading-relaxed mb-6">
                  "{story.quote}"
                </blockquote>

                <div className="flex items-center gap-3 pt-4 border-t border-border">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sage/40 to-sage/20 flex items-center justify-center text-sage-700 text-sm font-medium">
                    {story.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{story.author}</p>
                    <p className="text-xs text-muted-foreground">{story.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Share Your Story */}
      <section className="py-20 bg-card">
        <div className="container mx-auto px-6">
          <div className="max-w-2xl mx-auto text-center">
            <MessageSquare className="w-10 h-10 text-terracotta mx-auto mb-6" />
            <h2 className="font-editorial text-3xl md:text-4xl text-foreground tracking-editorial mb-4">
              Has CareCircle helped your family?
            </h2>
            <p className="text-muted-foreground text-lg mb-8">
              We'd love to hear from you. Your story might help another family 
              find their footing during a difficult time.
            </p>
            <a
              href="mailto:stories@carecircle.app"
              className="inline-flex items-center gap-2 bg-terracotta text-white px-6 py-3 rounded-lg font-medium hover:bg-terracotta/90 transition-colors"
            >
              Share Your Story
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-foreground text-background">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="font-editorial text-3xl md:text-4xl lg:text-5xl text-background tracking-editorial mb-6">
              Ready to write your own story?
            </h2>
            <p className="text-background/70 text-lg mb-10">
              Join 50,000+ families who've replaced chaos with calm.
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
