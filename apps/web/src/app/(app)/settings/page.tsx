'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { api } from '@/lib/api/client';
import toast from 'react-hot-toast';
import {
  User,
  Bell,
  Shield,
  LogOut,
  ChevronRight,
  Smartphone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Check,
} from 'lucide-react';

export default function SettingsPage() {
  const { user, logout, updateUser } = useAuth();
  const queryClient = useQueryClient();
  const pushNotifications = usePushNotifications();

  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'security'>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: typeof profileData) => api.patch('/users/me', data),
    onSuccess: (data) => {
      updateUser(data);
      setIsEditing(false);
      toast.success('Profile updated successfully');
    },
    onError: () => {
      toast.error('Failed to update profile');
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      api.post('/auth/change-password', data),
    onSuccess: () => {
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password changed successfully');
    },
    onError: () => {
      toast.error('Failed to change password');
    },
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(profileData);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (passwordData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    changePasswordMutation.mutate({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword,
    });
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  return (
    <div className="pb-6">
      <PageHeader title="Settings" subtitle="Manage your account preferences" />

      <div className="px-4 sm:px-6 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-accent-primary text-white'
                  : 'bg-bg-muted text-text-secondary hover:bg-bg-subtle'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-text-primary">Personal Information</h2>
                {!isEditing && (
                  <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>
                    Edit
                  </Button>
                )}
              </div>

              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <Input
                  label="Full Name"
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  disabled={!isEditing}
                  leftIcon={<User className="w-5 h-5" />}
                />
                <Input
                  label="Email"
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  disabled={!isEditing}
                  leftIcon={<Mail className="w-5 h-5" />}
                />
                <Input
                  label="Phone"
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  disabled={!isEditing}
                  placeholder="For emergency SMS alerts"
                  leftIcon={<Smartphone className="w-5 h-5" />}
                />

                {isEditing && (
                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setIsEditing(false);
                        setProfileData({
                          name: user?.name || '',
                          email: user?.email || '',
                          phone: user?.phone || '',
                        });
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      isLoading={updateProfileMutation.isPending}
                    >
                      Save Changes
                    </Button>
                  </div>
                )}
              </form>
            </Card>
          </motion.div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-text-primary mb-6">Push Notifications</h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-bg-muted rounded-lg">
                  <div>
                    <p className="font-medium text-text-primary">Browser Notifications</p>
                    <p className="text-sm text-text-secondary">
                      Receive alerts even when the app isn&apos;t open
                    </p>
                  </div>
                  {pushNotifications.isSupported ? (
                    pushNotifications.isSubscribed ? (
                      <Badge variant="success">
                        <Check className="w-3 h-3 mr-1" />
                        Enabled
                      </Badge>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={pushNotifications.subscribe}
                        isLoading={pushNotifications.isLoading}
                      >
                        Enable
                      </Button>
                    )
                  ) : (
                    <Badge variant="default">Not supported</Badge>
                  )}
                </div>

                <div className="border-t border-border pt-4">
                  <h3 className="font-medium text-text-primary mb-4">Notification Types</h3>
                  {[
                    { label: 'Emergency Alerts', description: 'Always enabled for safety', enabled: true, locked: true },
                    { label: 'Medication Reminders', description: 'Get reminded before scheduled doses', enabled: true },
                    { label: 'Appointment Reminders', description: 'Upcoming appointment notifications', enabled: true },
                    { label: 'Shift Reminders', description: 'When your shift is starting', enabled: true },
                    { label: 'Family Activity', description: 'When family members log activities', enabled: false },
                  ].map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-3 border-b border-border last:border-0"
                    >
                      <div>
                        <p className="font-medium text-text-primary">{item.label}</p>
                        <p className="text-sm text-text-secondary">{item.description}</p>
                      </div>
                      <button
                        className={`w-12 h-6 rounded-full transition-colors ${
                          item.enabled ? 'bg-accent-primary' : 'bg-bg-subtle'
                        } ${item.locked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        disabled={item.locked}
                      >
                        <div
                          className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform ${
                            item.enabled ? 'translate-x-6' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-text-primary mb-6">Change Password</h2>

              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="relative">
                  <Input
                    label="Current Password"
                    type={showPassword ? 'text' : 'password'}
                    value={passwordData.currentPassword}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, currentPassword: e.target.value })
                    }
                    leftIcon={<Lock className="w-5 h-5" />}
                  />
                </div>
                <Input
                  label="New Password"
                  type={showPassword ? 'text' : 'password'}
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, newPassword: e.target.value })
                  }
                  leftIcon={<Lock className="w-5 h-5" />}
                />
                <div className="relative">
                  <Input
                    label="Confirm New Password"
                    type={showPassword ? 'text' : 'password'}
                    value={passwordData.confirmPassword}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                    }
                    leftIcon={<Lock className="w-5 h-5" />}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-9 text-text-tertiary hover:text-text-secondary"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  isLoading={changePasswordMutation.isPending}
                  disabled={!passwordData.currentPassword || !passwordData.newPassword}
                >
                  Change Password
                </Button>
              </form>
            </Card>

            <Card className="p-6">
              <h2 className="text-lg font-semibold text-text-primary mb-4">Sessions</h2>
              <p className="text-sm text-text-secondary mb-4">
                Manage your active sessions and sign out from other devices.
              </p>
              <Button variant="secondary">
                Sign Out Other Devices
              </Button>
            </Card>

            <Card className="p-6 border-error">
              <h2 className="text-lg font-semibold text-error mb-4">Danger Zone</h2>
              <Button variant="danger" onClick={handleLogout} leftIcon={<LogOut className="w-4 h-4" />}>
                Log Out
              </Button>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
