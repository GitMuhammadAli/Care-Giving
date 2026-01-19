import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { QueryProvider } from '@/components/providers/query-provider';
import { ToastProvider } from '@/components/providers/toast-provider';
import { AuthProvider } from '@/components/providers/auth-provider';
import { ServiceWorkerProvider } from '@/components/providers/service-worker-provider';
import { libreBaskerville, sourceSans3 } from '@/lib/fonts';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: {
    default: 'CareCircle - Family Caregiving Coordination',
    template: '%s | CareCircle',
  },
  description:
    'A quieter way to coordinate care for the people who matter most. Share updates, organize tasks, and stay connected—without the noise.',
  keywords: ['caregiving', 'family care', 'elderly care', 'medication tracking', 'care coordination'],
  authors: [{ name: 'CareCircle' }],
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'CareCircle',
    title: 'CareCircle - Family Caregiving Coordination',
    description:
      'A quieter way to coordinate care for the people who matter most. Share updates, organize tasks, and stay connected—without the noise.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'CareCircle - Family Caregiving Coordination',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CareCircle - Family Caregiving Coordination',
    description:
      'A quieter way to coordinate care for the people who matter most. Share updates, organize tasks, and stay connected—without the noise.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#A8B5A0', // Sage green
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${libreBaskerville.variable} ${sourceSans3.variable} antialiased`}>
      <body className="min-h-screen bg-background text-foreground font-body">
        <QueryProvider>
          <AuthProvider>
            <ServiceWorkerProvider>
              <ToastProvider />
              {children}
            </ServiceWorkerProvider>
          </AuthProvider>
        </QueryProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
