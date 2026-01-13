// Static data for CareCircle

export const testimonials = [
  {
    id: 1,
    quote: "When Dad was diagnosed, our family scattered across four states suddenly needed to become a team. CareCircle gave us a home base. It's been two years now, and I can't imagine doing this without it.",
    author: "Jennifer Walsh",
    role: "Caring for her father in Portland, OR",
    featured: true,
  },
  {
    id: 2,
    quote: "No more group text chaos. No more 'did anyone call the pharmacy?' Now we just know.",
    author: "Michael & David Chen",
    role: "Brothers, San Francisco",
    featured: false,
  },
  {
    id: 3,
    quote: "As her hospice nurse, being invited into the family's circle helped me provide better care. I could see the full picture.",
    author: "Nurse Patricia Okonkwo",
    role: "Hospice care provider",
    featured: false,
  },
  {
    id: 4,
    quote: "Mom's care team includes her three children, two neighbors, and her church friend. CareCircle keeps all eight of us aligned without a single scheduling conflict.",
    author: "Roberto Mendez",
    role: "Son & primary caregiver, Austin, TX",
    featured: false,
  },
];

export const features = [
  {
    number: "01",
    title: "Private by design",
    description: "Your circle is yours alone. No ads, no data harvesting, no strangers. Just family.",
  },
  {
    number: "02",
    title: "Shared awareness",
    description: "Everyone stays informed without the endless text chains. One place, one truth.",
  },
  {
    number: "03",
    title: "Gentle coordination",
    description: "Assign tasks without guilt. Request help without friction. Care without burnout.",
  },
  {
    number: "04",
    title: "Lasting memory",
    description: "Every update becomes part of your family's story. A record of love, preserved.",
  },
  {
    number: "05",
    title: "Simple by choice",
    description: "No learning curve. No feature overload. Just the tools you actually need.",
  },
  {
    number: "06",
    title: "Always free",
    description: "Caring for family shouldn't cost extra. CareCircle is free, today and always.",
  },
];

export const howItWorks = [
  {
    step: "First",
    title: "Create your circle",
    description: "Name it after your loved one. Add a photo if you'd like. It takes thirty seconds.",
  },
  {
    step: "Then",
    title: "Invite your people",
    description: "Send a simple link. Siblings, spouses, nurses, neighbors—anyone who helps.",
  },
  {
    step: "Finally",
    title: "Care together",
    description: "Share updates. Coordinate visits. Track medications. Celebrate small wins. Grieve together when needed.",
  },
];

export const stats = [
  { value: "50,000+", label: "Families" },
  { value: "4.9", label: "App Store rating" },
  { value: "100%", label: "Free forever" },
];

export const teamMembers = [
  {
    name: "Eleanor Chen",
    role: "Founder & CEO",
    bio: "After caring for both her parents through illness, Eleanor founded CareCircle to help other families navigate the same journey with more support.",
  },
  {
    name: "Marcus Williams",
    role: "Head of Product",
    bio: "Marcus brings 15 years of healthcare technology experience, with a focus on making complex tools feel simple and human.",
  },
  {
    name: "Dr. Sarah Patel",
    role: "Chief Medical Advisor",
    bio: "A geriatrician with 20 years of practice, Sarah ensures CareCircle meets the real needs of caregivers and care recipients.",
  },
];

export const journalEntries = [
  {
    id: 1,
    title: "The Art of Asking for Help",
    excerpt: "Caregiving doesn't have to be a solo journey. Here's how families are learning to distribute the load.",
    date: "December 15, 2024",
    readTime: "5 min read",
    category: "Guidance",
  },
  {
    id: 2,
    title: "When Words Aren't Enough",
    excerpt: "Sometimes presence is the gift. A reflection on being there when someone is facing the end.",
    date: "December 8, 2024",
    readTime: "4 min read",
    category: "Stories",
  },
  {
    id: 3,
    title: "Coordinating Care Across Distance",
    excerpt: "Practical strategies for families spread across different cities and time zones.",
    date: "November 30, 2024",
    readTime: "6 min read",
    category: "Practical",
  },
];

export const pricingPlans = [
  {
    name: "Family",
    price: "Free",
    description: "Everything you need to coordinate care for one loved one.",
    features: [
      "Unlimited circle members",
      "Shared updates & timeline",
      "Task coordination",
      "Medication tracking",
      "Private & secure",
    ],
    highlighted: true,
  },
  {
    name: "Professional",
    price: "$9/mo",
    description: "For care professionals managing multiple families.",
    features: [
      "Multiple care circles",
      "Professional profile",
      "Advanced scheduling",
      "HIPAA compliance tools",
      "Priority support",
    ],
    highlighted: false,
  },
];

export const faqItems = [
  {
    question: "Is CareCircle really free?",
    answer: "Yes. Our Family plan is completely free, forever. We believe every family deserves access to care coordination tools, regardless of their financial situation.",
  },
  {
    question: "Who can I invite to my circle?",
    answer: "Anyone who's part of your care team—family members, friends, neighbors, paid caregivers, nurses, or doctors. You control who has access.",
  },
  {
    question: "Is my information private and secure?",
    answer: "Absolutely. We use bank-level encryption, never sell your data, and give you complete control over who sees what in your circle.",
  },
  {
    question: "Can I use CareCircle for multiple loved ones?",
    answer: "Yes. You can create separate circles for different people you're caring for, keeping each care team organized and focused.",
  },
  {
    question: "What happens to our data if we stop using CareCircle?",
    answer: "You can export all your updates and information at any time. If you close your account, we permanently delete your data within 30 days.",
  },
];

export const navLinks = [
  { label: "About", href: "/about" },
  { label: "How It Works", href: "/how-it-works" },
  { label: "Stories", href: "/stories" },
  { label: "Journal", href: "/journal" },
  { label: "Pricing", href: "/pricing" },
  { label: "Contact", href: "/contact" },
];

export const footerLinks = {
  product: [
    { label: "Features", href: "/features" },
    { label: "Pricing", href: "/pricing" },
    { label: "Security", href: "/security" },
  ],
  company: [
    { label: "About", href: "/about" },
    { label: "Journal", href: "/journal" },
    { label: "Contact", href: "/contact" },
  ],
  legal: [
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
    { label: "HIPAA", href: "/hipaa" },
  ],
};
