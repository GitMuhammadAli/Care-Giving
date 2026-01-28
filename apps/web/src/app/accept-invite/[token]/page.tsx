'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { api } from '@/lib/api/client';
import { useAuthContext } from '@/components/providers/auth-provider';
import { useAuth } from '@/hooks/use-auth';
import { Users, CheckCircle, XCircle, Loader2, Home, Heart } from 'lucide-react';

interface InvitationDetails {
  id: string;
  familyName: string;
  inviterName: string;
  role: string;
  email: string;
  expiresAt: string;
}

export default function AcceptInvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const { isAuthenticated, isInitialized, user } = useAuthContext();
  const { syncWithServer } = useAuth();
  const [status, setStatus] = useState<'loading' | 'valid' | 'accepted' | 'declined' | 'error'>('loading');
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [error, setError] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch invitation details on mount
  useEffect(() => {
    if (!token) return;
    fetchInvitation();
  }, [token]);

  const fetchInvitation = async () => {
    try {
      // Use the public endpoint for invitation details
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const response = await fetch(`${apiUrl}/families/invitations/${token}/details`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Invalid invitation');
      }

      const data = await response.json();
      setInvitation(data);
      setStatus('valid');
    } catch (err: any) {
      setError(err.message || 'This invitation is invalid or has expired');
      setStatus('error');
    }
  };

  const handleAccept = async () => {
    if (!isInitialized) return;

    if (!isAuthenticated) {
      // Store token and redirect to register (new users) with returnUrl
      localStorage.setItem('pendingInviteToken', token);
      const returnUrl = encodeURIComponent(`/accept-invite/${token}`);
      // Redirect to register by default since invited users likely don't have an account
      router.push(`/register?returnUrl=${returnUrl}&email=${encodeURIComponent(invitation?.email || '')}`);
      return;
    }

    // Check if the logged-in user's email matches the invitation email
    if (user?.email && invitation?.email && user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      setError(`This invitation was sent to ${invitation.email}. You are logged in as ${user.email}. Please log out and log in with the correct account.`);
      setStatus('error');
      return;
    }

    setIsProcessing(true);
    try {
      await api.post(`/families/invitations/${token}/accept`, {});
      // Force sync with server to get updated family data with cache invalidation
      // This ensures we get fresh data including the newly joined family
      await syncWithServer();
      setStatus('accepted');
      setTimeout(() => router.push('/dashboard'), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to accept invitation');
      setStatus('error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDecline = async () => {
    setIsProcessing(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const response = await fetch(`${apiUrl}/families/invitations/${token}/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to decline invitation');
      }

      setStatus('declined');
    } catch (err: any) {
      setError(err.message || 'Failed to decline invitation');
      setStatus('error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Show loading while fetching invitation OR while auth is initializing
  if (status === 'loading' || !isInitialized) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Card className="p-8 text-center">
            <Loader2 className="w-12 h-12 animate-spin text-sage-700 mx-auto mb-4" />
            <p className="text-muted-foreground">Loading invitation...</p>
          </Card>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="p-8 text-center max-w-md">
            <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h1 className="text-2xl font-semibold text-foreground mb-2">Invitation Error</h1>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Link href="/">
              <Button variant="default">
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  if (status === 'accepted') {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="p-8 text-center max-w-md">
            <CheckCircle className="w-16 h-16 text-sage-700 mx-auto mb-4" />
            <h1 className="text-2xl font-semibold text-foreground mb-2">Welcome to the Family!</h1>
            <p className="text-muted-foreground mb-4">
              You&apos;ve successfully joined <strong>{invitation?.familyName}</strong>
            </p>
            <p className="text-sm text-sage-400">Redirecting to dashboard...</p>
          </Card>
        </div>
      </div>
    );
  }

  if (status === 'declined') {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="p-8 text-center max-w-md">
            <XCircle className="w-16 h-16 text-sage-400 mx-auto mb-4" />
            <h1 className="text-2xl font-semibold text-foreground mb-2">Invitation Declined</h1>
            <p className="text-muted-foreground mb-6">
              You&apos;ve declined the invitation to join {invitation?.familyName}.
            </p>
            <Link href="/">
              <Button variant="secondary">Go Home</Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  // Status: valid - show invitation details
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-sage-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-sage-700" />
            </div>
            <h1 className="text-2xl font-semibold text-foreground mb-2">You&apos;re Invited!</h1>
            <p className="text-muted-foreground">
              <strong>{invitation?.inviterName}</strong> has invited you to join
            </p>
          </div>

          <div className="bg-sage-50 rounded-lg p-4 mb-6">
            <h2 className="text-xl font-semibold text-foreground text-center mb-2">
              {invitation?.familyName}
            </h2>
            <p className="text-center text-muted-foreground">
              Role: <span className="font-medium text-sage-700">{invitation?.role}</span>
            </p>
          </div>

          {!isAuthenticated && (
            <div className="bg-sage-100 border border-sage-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-foreground mb-2">
                Create an account to join this care circle, or sign in if you already have one.
              </p>
              <p className="text-xs text-muted-foreground">
                Invitation sent to: <strong>{invitation?.email}</strong>
              </p>
            </div>
          )}

          {isAuthenticated && user?.email?.toLowerCase() !== invitation?.email?.toLowerCase() && (
            <div className="bg-terracotta/10 border border-terracotta/30 rounded-lg p-4 mb-6">
              <p className="text-sm text-foreground">
                This invitation was sent to <strong>{invitation?.email}</strong>.
                You are logged in as <strong>{user?.email}</strong>.
              </p>
            </div>
          )}

          <div className="space-y-3">
            <Button
              variant="default"
              size="lg"
              className="w-full"
              onClick={handleAccept}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              {isAuthenticated ? 'Accept Invitation' : 'Create Account to Accept'}
            </Button>
            {!isAuthenticated && (
              <Link
                href={`/login?returnUrl=${encodeURIComponent(`/accept-invite/${token}`)}`}
                className="block"
              >
                <Button variant="secondary" size="lg" className="w-full">
                  Already have an account? Sign In
                </Button>
              </Link>
            )}
            <Button
              variant="ghost"
              size="lg"
              className="w-full"
              onClick={handleDecline}
              disabled={isProcessing}
            >
              Decline
            </Button>
          </div>

          <p className="text-xs text-sage-400 text-center mt-4">
            This invitation expires on {new Date(invitation?.expiresAt || '').toLocaleDateString()}
          </p>
        </Card>
      </div>
      <Footer />
    </div>
  );
}

// Simple header component for the invite page
function Header() {
  return (
    <header className="p-4 sm:p-6">
      <Link href="/" className="inline-flex items-center gap-2">
        <div className="w-9 h-9 rounded-lg bg-sage-700 flex items-center justify-center">
          <Heart className="w-5 h-5 text-cream" fill="currentColor" />
        </div>
        <span className="font-serif text-xl text-foreground">CareCircle</span>
      </Link>
    </header>
  );
}

// Simple footer component
function Footer() {
  return (
    <footer className="p-4 sm:p-6 text-center">
      <p className="text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} CareCircle. Made with care for families.
      </p>
    </footer>
  );
}
