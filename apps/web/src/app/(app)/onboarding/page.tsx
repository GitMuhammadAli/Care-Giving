'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  Heart,
  Users,
  CheckCircle2,
  ArrowRight,
  Calendar,
  User,
  Mail,
  Plus,
  X,
} from 'lucide-react';
import { useCreateFamily, useInviteMember } from '@/hooks/use-family';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { careRecipientsApi, authApi } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import toast from 'react-hot-toast';

type Step = 'family' | 'care-recipient' | 'invite' | 'complete';

interface FamilyData {
  name: string;
}

interface CareRecipientData {
  firstName: string;
  lastName: string;
  preferredName: string;
  dateOfBirth: string;
  relationship: string;
}

interface InviteMemberData {
  email: string;
  role: 'ADMIN' | 'CAREGIVER' | 'VIEWER';
}

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, syncWithServer } = useAuth();
  const queryClient = useQueryClient();

  const [currentStep, setCurrentStep] = useState<Step>('family');
  const [familyData, setFamilyData] = useState<FamilyData>({ name: '' });
  const [careRecipientData, setCareRecipientData] = useState<CareRecipientData>({
    firstName: '',
    lastName: '',
    preferredName: '',
    dateOfBirth: '',
    relationship: '',
  });
  const [inviteMembers, setInviteMembers] = useState<InviteMemberData[]>([]);
  const [newInviteEmail, setNewInviteEmail] = useState('');
  const [newInviteRole, setNewInviteRole] = useState<'ADMIN' | 'CAREGIVER' | 'VIEWER'>('CAREGIVER');

  const [createdFamilyId, setCreatedFamilyId] = useState<string | null>(null);
  const [isSendingInvites, setIsSendingInvites] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);

  const createFamily = useCreateFamily();
  const inviteMember = useInviteMember(createdFamilyId || '');

  const createCareRecipient = useMutation({
    mutationFn: async (data: CareRecipientData & { familyId: string }) => {
      const { familyId, firstName, lastName, preferredName, dateOfBirth, relationship } = data;

      // Transform data to match API expectations
      const apiData = {
        fullName: `${firstName} ${lastName}`.trim(),
        preferredName: preferredName || undefined,
        dateOfBirth: dateOfBirth || undefined,
        // Note: relationship is not in the API schema, so we don't send it
      };

      return careRecipientsApi.create(familyId, apiData);
    },
    onSuccess: () => {
      toast.success('Care recipient added successfully!');
      setCurrentStep('invite');
    },
    onError: (error: any) => {
      const errorMessage = error?.message || 'Failed to add care recipient';
      toast.error(errorMessage);
    },
  });

  // Check if user has completed onboarding
  const onboardingCompleted = user?.onboardingCompleted === true;

  // CRITICAL: If user has completed onboarding, redirect to dashboard immediately
  // This prevents duplicate families and ensures onboarding is one-time only
  useEffect(() => {
    if (!authLoading && onboardingCompleted) {
      console.log('User has completed onboarding, redirecting to dashboard');
      window.location.href = '/dashboard';
    }
  }, [authLoading, onboardingCompleted]);

  const steps = [
    { id: 'family', label: 'Create Family', icon: Users },
    { id: 'care-recipient', label: 'Add Loved One', icon: Heart },
    { id: 'invite', label: 'Invite Members', icon: Mail },
    { id: 'complete', label: 'Complete', icon: CheckCircle2 },
  ];

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault();

    // Guard: Prevent creating families if onboarding is already completed
    if (onboardingCompleted) {
      toast.error('Onboarding already completed. Redirecting to dashboard...');
      window.location.href = '/dashboard';
      return;
    }

    if (!familyData.name) {
      toast.error('Please enter a family name');
      return;
    }

    // Guard: Only allow creating one family during this session
    if (createdFamilyId) {
      toast.error('Family already created. Please continue to next step.');
      setCurrentStep('care-recipient');
      return;
    }

    try {
      const result = await createFamily.mutateAsync({
        name: familyData.name,
      });

      setCreatedFamilyId(result.id);
      // Note: toast is shown by the useCreateFamily hook
      setCurrentStep('care-recipient');
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleCreateCareRecipient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!careRecipientData.firstName || !careRecipientData.lastName || !careRecipientData.dateOfBirth) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Validate date of birth is not in the future
    const dob = new Date(careRecipientData.dateOfBirth);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to compare dates only

    if (dob > today) {
      toast.error('Date of birth cannot be in the future');
      return;
    }

    // Validate age is reasonable (e.g., not more than 150 years old)
    const age = Math.floor((today.getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    if (age > 150) {
      toast.error('Please enter a valid date of birth');
      return;
    }

    if (!createdFamilyId) {
      toast.error('No family created yet');
      return;
    }

    await createCareRecipient.mutateAsync({
      ...careRecipientData,
      familyId: createdFamilyId,
    });
  };

  const handleAddInvite = () => {
    if (!newInviteEmail) return;

    setInviteMembers([...inviteMembers, { email: newInviteEmail, role: newInviteRole }]);
    setNewInviteEmail('');
  };

  const handleRemoveInvite = (index: number) => {
    setInviteMembers(inviteMembers.filter((_, i) => i !== index));
  };

  const handleSkipInvites = () => {
    setCurrentStep('complete');
  };

  const handleSendInvites = async () => {
    if (!createdFamilyId || inviteMembers.length === 0) return;

    setIsSendingInvites(true);

    try {
      // Send all invitations
      for (const invite of inviteMembers) {
        await inviteMember.mutateAsync({
          email: invite.email,
          role: invite.role,
          familyId: createdFamilyId,
        });
      }

      toast.success(`${inviteMembers.length} invitation${inviteMembers.length > 1 ? 's' : ''} sent successfully!`);
      setCurrentStep('complete');
    } catch (error) {
      // Error is already handled by the mutation
      setIsSendingInvites(false);
    }
  };

  const handleFinish = async () => {
    setIsFinishing(true);
    try {
      console.log('Marking onboarding as completed...');
      // Mark onboarding as completed in the database
      await authApi.completeOnboarding();

      console.log('Onboarding marked complete, syncing with server...');
      // Force sync with server to get all updated data with cache invalidation
      await syncWithServer();

      console.log('User data synced, navigating to dashboard...');
      toast.success('Welcome to CareCircle! 🎉');

      // Navigate to dashboard
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      toast.error('Failed to complete onboarding. Please try again.');
      setIsFinishing(false);
    }
  };

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking your status...</p>
        </div>
      </div>
    );
  }

  // CRITICAL: Don't render onboarding if user has completed onboarding
  // This prevents the UI from showing and prevents duplicate work
  if (onboardingCompleted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isCompleted = index < currentStepIndex;
              const isCurrent = index === currentStepIndex;

              return (
                <div key={step.id} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        'w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all',
                        isCompleted
                          ? 'bg-sage border-sage text-background'
                          : isCurrent
                          ? 'bg-sage/10 border-sage text-sage'
                          : 'bg-muted border-border text-muted-foreground'
                      )}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <p className={cn('text-sm mt-2', isCurrent ? 'text-foreground font-medium' : 'text-muted-foreground')}>
                      {step.label}
                    </p>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={cn('flex-1 h-0.5 mx-4', isCompleted ? 'bg-sage' : 'bg-border')} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          {currentStep === 'family' && (
            <motion.div
              key="family"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="p-8">
                <div className="mb-6">
                  <h1 className="text-3xl font-serif mb-2">Welcome to CareCircle</h1>
                  <p className="text-muted-foreground">
                    Let's start by creating your family circle. This is where you and your family will coordinate care together.
                  </p>
                </div>

                <form onSubmit={handleCreateFamily} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Family Name <span className="text-destructive">*</span></label>
                    <Input
                      placeholder="e.g., The Thompsons, Grandma's Care Team"
                      value={familyData.name}
                      onChange={(e) => setFamilyData({ name: e.target.value })}
                      className="text-lg h-12"
                      autoFocus
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Choose a name that everyone will recognize
                    </p>
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    fullWidth
                    rightIcon={<ArrowRight className="w-5 h-5" />}
                    disabled={createFamily.isPending}
                  >
                    {createFamily.isPending ? 'Creating...' : 'Continue'}
                  </Button>
                </form>
              </Card>
            </motion.div>
          )}

          {currentStep === 'care-recipient' && (
            <motion.div
              key="care-recipient"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="p-8">
                <div className="mb-6">
                  <h1 className="text-3xl font-serif mb-2">Add Your Loved One</h1>
                  <p className="text-muted-foreground">
                    Tell us about the person you're caring for. This helps personalize the experience.
                  </p>
                </div>

                <form onSubmit={handleCreateCareRecipient} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">First Name *</label>
                      <Input
                        placeholder="Margaret"
                        value={careRecipientData.firstName}
                        onChange={(e) => setCareRecipientData({ ...careRecipientData, firstName: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Last Name *</label>
                      <Input
                        placeholder="Thompson"
                        value={careRecipientData.lastName}
                        onChange={(e) => setCareRecipientData({ ...careRecipientData, lastName: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Preferred Name</label>
                    <Input
                      placeholder="Grandma, Mom, Dad, etc."
                      value={careRecipientData.preferredName}
                      onChange={(e) => setCareRecipientData({ ...careRecipientData, preferredName: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Date of Birth *</label>
                      <Input
                        type="date"
                        value={careRecipientData.dateOfBirth}
                        onChange={(e) => setCareRecipientData({ ...careRecipientData, dateOfBirth: e.target.value })}
                        max={new Date().toISOString().split('T')[0]}
                        required
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Cannot be a future date
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Relationship</label>
                      <select
                        value={careRecipientData.relationship}
                        onChange={(e) => setCareRecipientData({ ...careRecipientData, relationship: e.target.value })}
                        className="w-full h-10 px-3 rounded-lg border border-border bg-background"
                      >
                        <option value="">Select...</option>
                        <option value="Parent">Parent</option>
                        <option value="Grandparent">Grandparent</option>
                        <option value="Spouse">Spouse</option>
                        <option value="Sibling">Sibling</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCurrentStep('family')}
                    >
                      Back
                    </Button>
                    <Button
                      type="submit"
                      size="lg"
                      fullWidth
                      rightIcon={<ArrowRight className="w-5 h-5" />}
                      disabled={createCareRecipient.isPending}
                    >
                      {createCareRecipient.isPending ? 'Adding...' : 'Continue'}
                    </Button>
                  </div>
                </form>
              </Card>
            </motion.div>
          )}

          {currentStep === 'invite' && (
            <motion.div
              key="invite"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="p-8">
                <div className="mb-6">
                  <h1 className="text-3xl font-serif mb-2">Invite Family Members</h1>
                  <p className="text-muted-foreground">
                    Invite siblings, spouses, or other caregivers to join your circle. You can skip this and invite them later.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <Input
                        type="email"
                        placeholder="email@example.com"
                        value={newInviteEmail}
                        onChange={(e) => setNewInviteEmail(e.target.value)}
                      />
                    </div>
                    <select
                      value={newInviteRole}
                      onChange={(e) => setNewInviteRole(e.target.value as 'ADMIN' | 'CAREGIVER' | 'VIEWER')}
                      className="px-3 rounded-lg border border-border bg-background"
                    >
                      <option value="CAREGIVER">Caregiver</option>
                      <option value="ADMIN">Admin</option>
                      <option value="VIEWER">Viewer</option>
                    </select>
                    <Button onClick={handleAddInvite}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add
                    </Button>
                  </div>

                  {inviteMembers.length > 0 && (
                    <div className="space-y-2 mt-6">
                      <p className="text-sm font-medium">Invitations to send:</p>
                      {inviteMembers.map((invite, index) => (
                        <div key={index} className="flex items-center justify-between p-4 bg-primary/5 border border-primary/20 rounded-lg hover:bg-primary/10 transition-colors">
                          <div>
                            <p className="font-medium text-foreground">{invite.email}</p>
                            <p className="text-sm text-primary font-medium">{invite.role}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveInvite(index)}
                            className="hover:bg-destructive/10 hover:text-destructive"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSkipInvites}
                      disabled={isSendingInvites}
                    >
                      Skip for Now
                    </Button>
                    <Button
                      size="lg"
                      fullWidth
                      onClick={handleSendInvites}
                      rightIcon={<ArrowRight className="w-5 h-5" />}
                      disabled={inviteMembers.length === 0 || isSendingInvites}
                    >
                      {isSendingInvites
                        ? 'Sending...'
                        : inviteMembers.length > 0
                        ? `Send ${inviteMembers.length} Invitation${inviteMembers.length > 1 ? 's' : ''}`
                        : 'Continue'}
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {currentStep === 'complete' && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Card className="p-8 text-center">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-sage/20 flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-sage" />
                </div>
                <h1 className="text-3xl font-serif mb-3">You're All Set!</h1>
                <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                  Your family circle is ready. You can now start coordinating care, tracking medications, and staying connected.
                </p>

                <div className="grid grid-cols-3 gap-4 mb-8 p-6 bg-muted rounded-xl">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-sage mb-1">✓</p>
                    <p className="text-sm text-muted-foreground">Family Created</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-sage mb-1">✓</p>
                    <p className="text-sm text-muted-foreground">Loved One Added</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-muted-foreground mb-1">{inviteMembers.length}</p>
                    <p className="text-sm text-muted-foreground">Invitations</p>
                  </div>
                </div>

                <Button
                  size="xl"
                  fullWidth
                  onClick={handleFinish}
                  disabled={isFinishing}
                  rightIcon={<ArrowRight className="w-5 h-5" />}
                >
                  {isFinishing ? 'Loading...' : 'Go to Dashboard'}
                </Button>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
