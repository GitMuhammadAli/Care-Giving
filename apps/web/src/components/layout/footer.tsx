'use client';

import { memo, useMemo } from 'react';
import Link from 'next/link';

// Static data moved outside component
const footerLinks = {
  product: [
    { label: 'Features', href: '/features' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Security', href: '/security' },
  ],
  company: [
    { label: 'About', href: '/about' },
    { label: 'Journal', href: '/journal' },
    { label: 'Contact', href: '/contact' },
  ],
  legal: [
    { label: 'Privacy', href: '/privacy' },
    { label: 'Terms', href: '/terms' },
    { label: 'HIPAA', href: '/hipaa' },
  ],
} as const;

// Memoized footer link component
const FooterLink = memo(function FooterLink({ 
  href, 
  label 
}: { 
  href: string; 
  label: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="text-foreground hover:text-sage transition-colors"
      >
        {label}
      </Link>
    </li>
  );
});

// Memoized link section
const LinkSection = memo(function LinkSection({ 
  title, 
  links 
}: { 
  title: string;
  links: readonly { label: string; href: string; }[];
}) {
  return (
    <div>
      <p className="label-caps text-slate mb-4">{title}</p>
      <ul className="space-y-3 text-sm">
        {links.map((link) => (
          <FooterLink key={link.href} href={link.href} label={link.label} />
        ))}
      </ul>
    </div>
  );
});

export const Footer = memo(function Footer() {
  // Memoize the year to prevent recalculation
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  return (
    <footer className="py-10 sm:py-16 bg-background border-t border-border">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-12 gap-8 sm:gap-10 md:gap-12">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-4 md:col-span-4">
            <Link href="/" className="font-editorial text-xl text-foreground mb-3 sm:mb-4 block">
              CareCircle
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
              A quieter way to coordinate care for the people who matter most.
            </p>
          </div>

          {/* Links - 3-column grid on mobile, spread on desktop */}
          <div className="col-span-1 sm:col-span-1 md:col-span-2 md:col-start-7">
            <LinkSection title="Product" links={footerLinks.product} />
          </div>

          <div className="col-span-1 sm:col-span-1 md:col-span-2">
            <LinkSection title="Company" links={footerLinks.company} />
          </div>

          <div className="col-span-2 sm:col-span-1 md:col-span-2">
            <LinkSection title="Legal" links={footerLinks.legal} />
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-10 sm:mt-16 pt-6 sm:pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
          <p className="text-xs sm:text-sm text-muted-foreground">
            © {currentYear} CareCircle. All rights reserved.
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground">Made with care, for caregivers.</p>
        </div>
      </div>
    </footer>
  );
});

export default Footer;
