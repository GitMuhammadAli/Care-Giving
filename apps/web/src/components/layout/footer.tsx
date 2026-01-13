'use client';

import Link from 'next/link';

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
};

export function Footer() {
  return (
    <footer className="py-16 bg-background border-t border-border">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-12 gap-12">
          {/* Brand */}
          <div className="md:col-span-4">
            <Link href="/" className="font-editorial text-xl text-foreground mb-4 block">
              CareCircle
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
              A quieter way to coordinate care for the people who matter most.
            </p>
          </div>

          {/* Links */}
          <div className="md:col-span-2 md:col-start-7">
            <p className="label-caps text-slate mb-4">Product</p>
            <ul className="space-y-3 text-sm">
              {footerLinks.product.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-foreground hover:text-sage transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-2">
            <p className="label-caps text-slate mb-4">Company</p>
            <ul className="space-y-3 text-sm">
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-foreground hover:text-sage transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-2">
            <p className="label-caps text-slate mb-4">Legal</p>
            <ul className="space-y-3 text-sm">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-foreground hover:text-sage transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-16 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} CareCircle. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground">Made with care, for caregivers.</p>
        </div>
      </div>
    </footer>
  );
}
