import type { Metadata, Viewport } from 'next';
import { QueryProvider } from '@/components/providers/query-provider';
import { ToastProvider } from '@/components/providers/toast-provider';
import { AuthProvider } from '@/components/providers/auth-provider';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'CareCircle - Family Caregiving Coordination',
  description:
    'A quieter way to coordinate care for the people who matter most. Share updates, organize tasks, and stay connected—without the noise.',
  keywords: ['caregiving', 'family care', 'elderly care', 'medication tracking', 'care coordination'],
  authors: [{ name: 'CareCircle' }],
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
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
    <html lang="en" className="antialiased">
      <body className="min-h-screen bg-background text-foreground font-body">
        <QueryProvider>
          <AuthProvider>
            <ToastProvider />
            {children}
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
