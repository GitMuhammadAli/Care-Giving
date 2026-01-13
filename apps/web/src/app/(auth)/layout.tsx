import Link from 'next/link';
import { Heart } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-4 sm:p-6">
        <Link href="/" className="inline-flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-sage flex items-center justify-center">
            <Heart className="w-5 h-5 text-foreground" fill="currentColor" />
          </div>
          <span className="font-editorial text-xl text-foreground">CareCircle</span>
        </Link>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">{children}</main>

      {/* Footer */}
      <footer className="p-4 sm:p-6 text-center">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} CareCircle. Made with care for families.
        </p>
      </footer>
    </div>
  );
}
