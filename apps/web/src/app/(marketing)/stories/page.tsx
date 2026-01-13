'use client';

import { motion } from 'framer-motion';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { testimonials } from '@/data/caregivers';

const extendedStories = [
  {
    id: 5,
    quote: "My husband has early-onset Alzheimer's. Our three adult children live in different cities. CareCircle became our lifeline—everyone knows what's happening, and I don't have to be the sole bearer of every update.",
    author: "Linda Yamamoto",
    role: "Wife & primary caregiver, Seattle",
    story: "We started using CareCircle two years ago. At first, I was the only one posting updates. But slowly, my children started adding their own notes—photos from video calls, observations from visits. It became less of a burden and more of a shared journal.",
  },
  {
    id: 6,
    quote: "As a geriatric care manager, I work with multiple families. CareCircle lets me stay connected to each one without the chaos of separate text threads and emails.",
    author: "James Morrison, GCM",
    role: "Professional care manager, Boston",
    story: "I manage care for eight different families. Before CareCircle, I was drowning in communication channels. Now, each family has their own circle, and I can move between them seamlessly. The families appreciate the transparency, and I appreciate the organization.",
  },
  {
    id: 7,
    quote: "When Mom moved into memory care, our family of six needed a way to coordinate visits. CareCircle made sure she had company every day without us tripping over each other.",
    author: "The Garcia Family",
    role: "Six siblings, Los Angeles",
    story: "Mom has six children, twelve grandchildren, and three great-grandchildren. Coordinating visits was impossible before CareCircle. Now, we use the calendar to make sure someone visits every single day, and we all see the updates from each visit. It's brought us closer as a family.",
  },
];

export default function StoriesPage() {
  const allTestimonials = [...testimonials, ...extendedStories];

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
                Stories
              </motion.p>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="font-editorial text-4xl md:text-5xl lg:text-6xl text-foreground leading-[1.1] tracking-editorial mb-8"
              >
                Real families,{" "}
                <em className="not-italic text-sage">real care</em>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-muted-foreground text-xl leading-relaxed"
              >
                Every caregiving journey is unique. Here are stories from families
                who&apos;ve found support, coordination, and peace of mind with CareCircle.
              </motion.p>
            </div>
          </div>
        </section>

        {/* Stories Grid */}
        <section className="py-24 bg-stone texture-paper">
          <div className="container mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-8">
              {allTestimonials.map((story, index) => (
                <motion.article
                  key={story.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className={`bg-background p-8 lg:p-12 border border-border ${
                    index === 0 ? "lg:col-span-2" : ""
                  }`}
                >
                  <blockquote>
                    <p className={`font-editorial text-foreground leading-snug tracking-editorial mb-8 ${
                      index === 0 ? "text-2xl md:text-3xl" : "text-xl md:text-2xl"
                    }`}>
                      &ldquo;{story.quote}&rdquo;
                    </p>
                    {"story" in story && (
                      <p className="text-muted-foreground leading-relaxed mb-8">
                        {story.story}
                      </p>
                    )}
                    <footer className="flex items-center gap-4 pt-6 border-t border-border">
                      <div className="w-12 h-12 rounded-full bg-sage/30" />
                      <div>
                        <p className="font-medium text-foreground">{story.author}</p>
                        <p className="text-sm text-muted-foreground">{story.role}</p>
                      </div>
                    </footer>
                  </blockquote>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        {/* Share your story */}
        <section className="py-24 texture-paper">
          <div className="container mx-auto px-6">
            <div className="max-w-2xl mx-auto text-center">
              <p className="label-caps text-slate mb-6">Share Your Story</p>
              <h2 className="font-editorial text-3xl md:text-4xl text-foreground tracking-editorial mb-6">
                Has CareCircle helped your family?
              </h2>
              <p className="text-muted-foreground text-lg mb-8">
                We&apos;d love to hear from you. Your story might help another family
                find their footing.
              </p>
              <a
                href="mailto:stories@carecircle.app"
                className="inline-block border border-foreground/20 px-6 py-3 label-caps text-foreground hover:bg-accent/30 transition-colors"
              >
                Share your story
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
