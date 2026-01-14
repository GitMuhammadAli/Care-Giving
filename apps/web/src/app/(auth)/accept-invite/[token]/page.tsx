'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { api } from '@/lib/api/client';
import { Users, CheckCircle, XCircle, Loader2, Home } from 'lucide-react';

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

  const [status, setStatus] = useState<'loading' | 'valid' | 'accepted' | 'declined' | 'error'>('loading');
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [error, setError] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();
    fetchInvitation();
  }, [token]);

  const checkAuth = async () => {
    try {
      const response = await api.get('/users/me');
      setIsAuthenticated(true);
    } catch {
      setIsAuthenticated(false);
    }
  };

  const fetchInvitation = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
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
    if (!isAuthenticated) {
      // Store token and redirect to login with returnUrl
      localStorage.setItem('pendingInviteToken', token);
      const returnUrl = encodeURIComponent(`/accept-invite/${token}`);
      router.push(`/login?returnUrl=${returnUrl}`);
      return;
    }

    setStatus('loading');
    try {
      await api.post(`/families/invitations/${token}/accept`, {});
      setStatus('accepted');
      setTimeout(() => router.push('/dashboard'), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to accept invitation');
      setStatus('error');
    }
  };

  const handleDecline = async () => {
    setStatus('loading');
    try {
      await api.post(`/families/invitations/${token}/decline`);
      setStatus('declined');
    } catch (err: any) {
      setError(err.message || 'Failed to decline invitation');
      setStatus('error');
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-base">
        <Card className="p-8 text-center">
          <Loader2 className="w-12 h-12 animate-spin text-accent-primary mx-auto mb-4" />
          <p className="text-text-secondary">Loading invitation...</p>
        </Card>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-base p-4">
        <Card className="p-8 text-center max-w-md">
          <XCircle className="w-16 h-16 text-error mx-auto mb-4" />
          <h1 className="text-2xl font-semibold text-text-primary mb-2">Invalid Invitation</h1>
          <p className="text-text-secondary mb-6">{error}</p>
          <Link href="/">
            <Button variant="primary">
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (status === 'accepted') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-base p-4">
        <Card className="p-8 text-center max-w-md">
          <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
          <h1 className="text-2xl font-semibold text-text-primary mb-2">Welcome to the Family!</h1>
          <p className="text-text-secondary mb-4">
            You&apos;ve successfully joined <strong>{invitation?.familyName}</strong>
          </p>
          <p className="text-sm text-text-tertiary">Redirecting to dashboard...</p>
        </Card>
      </div>
    );
  }

  if (status === 'declined') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-base p-4">
        <Card className="p-8 text-center max-w-md">
          <XCircle className="w-16 h-16 text-text-tertiary mx-auto mb-4" />
          <h1 className="text-2xl font-semibold text-text-primary mb-2">Invitation Declined</h1>
          <p className="text-text-secondary mb-6">
            You&apos;ve declined the invitation to join {invitation?.familyName}.
          </p>
          <Link href="/">
            <Button variant="secondary">Go Home</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-base p-4">
      <Card className="p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-accent-primary-light rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-accent-primary" />
          </div>
          <h1 className="text-2xl font-semibold text-text-primary mb-2">You&apos;re Invited!</h1>
          <p className="text-text-secondary">
            <strong>{invitation?.inviterName}</strong> has invited you to join
          </p>
        </div>

        <div className="bg-bg-muted rounded-lg p-4 mb-6">
          <h2 className="text-xl font-semibold text-text-primary text-center mb-2">
            {invitation?.familyName}
          </h2>
          <p className="text-center text-text-secondary">
            Role: <span className="font-medium text-accent-primary">{invitation?.role}</span>
          </p>
        </div>

        {!isAuthenticated && (
          <div className="bg-warning-light border border-warning rounded-lg p-4 mb-6">
            <p className="text-sm text-text-primary">
              You&apos;ll need to sign in or create an account to accept this invitation.
            </p>
          </div>
        )}

        <div className="space-y-3">
          <Button variant="primary" size="lg" className="w-full" onClick={handleAccept}>
            {isAuthenticated ? 'Accept Invitation' : 'Sign In to Accept'}
          </Button>
          <Button variant="ghost" size="lg" className="w-full" onClick={handleDecline}>
            Decline
          </Button>
        </div>

        <p className="text-xs text-text-tertiary text-center mt-4">
          This invitation expires on {new Date(invitation?.expiresAt || '').toLocaleDateString()}
        </p>
      </Card>
    </div>
  );
}

