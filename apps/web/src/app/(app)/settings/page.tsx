'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { useNotifications } from '@/components/providers/notification-provider';
import { authApi } from '@/lib/api/auth';
import toast from 'react-hot-toast';
import {
  User,
  Bell,
  Shield,
  LogOut,
  Smartphone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Check,
  Save,
  X,
  RefreshCw,
} from 'lucide-react';

export default function SettingsPage() {
  const { user, logout, updateUser, syncWithServer } = useAuth();
  const pushNotifications = usePushNotifications();
  const { showPermissionPrompt } = useNotifications();

  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'security'>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isLoggingOutAll, setIsLoggingOutAll] = useState(false);

  // Profile form state
  const [profileData, setProfileData] = useState({
    fullName: '',
    email: '',
    phone: '',
  });

  // Password form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Initialize form with user data
  useEffect(() => {
    if (user) {
      setProfileData({
        fullName: user.fullName || '',
        email: user.email || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  // Handle profile update
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profileData.fullName.trim()) {
      toast.error('Full name is required');
      return;
    }

    setIsUpdatingProfile(true);
    try {
      // Use the updateUser from Zustand which calls authApi.updateProfile
      await updateUser({
        fullName: profileData.fullName,
        phone: profileData.phone || undefined,
      });
      
      setIsEditing(false);
      toast.success('Profile updated successfully');
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      toast.error(error?.message || 'Failed to update profile');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // Handle password change
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (passwordData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    
    setIsChangingPassword(true);
    try {
      await authApi.changePassword(passwordData.currentPassword, passwordData.newPassword);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password changed successfully');
    } catch (error: any) {
      console.error('Failed to change password:', error);
      toast.error(error?.message || 'Failed to change password. Check your current password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Handle cancel editing
  const handleCancelEdit = () => {
    setIsEditing(false);
    if (user) {
      setProfileData({
        fullName: user.fullName || '',
        email: user.email || '',
        phone: user.phone || '',
      });
    }
  };

  // Handle logout
  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  // Handle logout from all devices
  const handleLogoutAll = async () => {
    setIsLoggingOutAll(true);
    try {
      await authApi.logoutAll();
      toast.success('Signed out from all devices');
      // Redirect to login since current session is also invalidated
      await logout();
      window.location.href = '/login';
    } catch (error: any) {
      console.error('Failed to logout from all devices:', error);
      toast.error(error?.message || 'Failed to sign out from all devices');
    } finally {
      setIsLoggingOutAll(false);
    }
  };

  // Handle notification enable with popup
  const handleEnableNotifications = async () => {
    if (pushNotifications.permission === 'default') {
      showPermissionPrompt();
    } else {
      await pushNotifications.subscribe();
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  return (
    <div className="pb-6">
      <PageHeader 
        title="Settings" 
        subtitle="Manage your account preferences"
        actions={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => syncWithServer()}
            className="text-text-secondary"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        }
      />

      <div className="px-4 sm:px-6 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-sage-700 text-cream'
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
                <div>
                  <h2 className="text-lg font-semibold text-text-primary">Personal Information</h2>
                  <p className="text-sm text-text-secondary mt-1">Update your account details</p>
                </div>
                {!isEditing && (
                  <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>
                    Edit
                  </Button>
                )}
              </div>

              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <Input
                  label="Full Name"
                  value={profileData.fullName}
                  onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                  disabled={!isEditing}
                  leftIcon={<User className="w-5 h-5" />}
                  placeholder="Your full name"
                />
                <Input
                  label="Email"
                  type="email"
                  value={profileData.email}
                  disabled={true} // Email changes require verification
                  leftIcon={<Mail className="w-5 h-5" />}
                  helperText="Contact support to change your email address"
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
                      variant="ghost"
                      onClick={handleCancelEdit}
                      disabled={isUpdatingProfile}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      isLoading={isUpdatingProfile}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </Button>
                  </div>
                )}
              </form>
            </Card>

            {/* Account Info Card */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-text-primary mb-4">Account Information</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-text-secondary">Account ID</span>
                  <span className="text-text-primary font-mono text-xs">{user?.id?.slice(0, 8)}...</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-text-secondary">Member since</span>
                  <span className="text-text-primary">
                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-text-secondary">Onboarding</span>
                  <Badge variant={user?.onboardingCompleted ? 'success' : 'warning'}>
                    {user?.onboardingCompleted ? 'Completed' : 'Pending'}
                  </Badge>
                </div>
              </div>
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
                {/* Browser Notifications Status */}
                <div className="flex items-center justify-between p-4 bg-bg-muted rounded-lg">
                  <div>
                    <p className="font-medium text-text-primary">Browser Notifications</p>
                    <p className="text-sm text-text-secondary">
                      {pushNotifications.permission === 'denied' 
                        ? 'Blocked - Enable in browser settings'
                        : 'Receive alerts even when the app isn\'t open'}
                    </p>
                  </div>
                  {pushNotifications.isSupported ? (
                    pushNotifications.permission === 'denied' ? (
                      <Badge variant="destructive">Blocked</Badge>
                    ) : pushNotifications.isSubscribed ? (
                      <div className="flex items-center gap-2">
                        <Badge variant="success">
                          <Check className="w-3 h-3 mr-1" />
                          Enabled
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={pushNotifications.unsubscribe}
                          isLoading={pushNotifications.isLoading}
                        >
                          Disable
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleEnableNotifications}
                        isLoading={pushNotifications.isLoading}
                      >
                        <Bell className="w-4 h-4 mr-2" />
                        Enable
                      </Button>
                    )
                  ) : (
                    <Badge variant="default">Not supported</Badge>
                  )}
                </div>

                {/* Permission Instructions */}
                {pushNotifications.permission === 'denied' && (
                  <div className="p-4 bg-error-light border border-error/20 rounded-lg">
                    <p className="text-sm font-medium text-error mb-2">Notifications Blocked</p>
                    <p className="text-sm text-text-secondary">
                      To enable notifications, click the lock icon in your browser's address bar, 
                      find "Notifications" and change it to "Allow", then refresh this page.
                    </p>
                  </div>
                )}

                <div className="border-t border-border pt-4">
                  <h3 className="font-medium text-text-primary mb-4">Notification Types</h3>
                  {[
                    { label: 'Emergency Alerts', description: 'Always enabled for safety', enabled: true, locked: true },
                    { label: 'Medication Reminders', description: 'Get reminded before scheduled doses', enabled: true, locked: false },
                    { label: 'Appointment Reminders', description: 'Upcoming appointment notifications', enabled: true, locked: false },
                    { label: 'Shift Reminders', description: 'When your shift is starting', enabled: true, locked: false },
                    { label: 'Family Activity', description: 'When family members log activities', enabled: false, locked: false },
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
                          item.enabled ? 'bg-sage-700' : 'bg-bg-subtle'
                        } ${item.locked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-90'}`}
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
              <h2 className="text-lg font-semibold text-text-primary mb-2">Change Password</h2>
              <p className="text-sm text-text-secondary mb-6">
                Use a strong password with at least 8 characters
              </p>

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
                    placeholder="Enter current password"
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
                  placeholder="Enter new password"
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
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-9 text-text-tertiary hover:text-text-secondary transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isChangingPassword}
                  disabled={!passwordData.currentPassword || !passwordData.newPassword}
                >
                  <Lock className="w-4 h-4 mr-2" />
                  Change Password
                </Button>
              </form>
            </Card>

            <Card className="p-6">
              <h2 className="text-lg font-semibold text-text-primary mb-2">Sessions</h2>
              <p className="text-sm text-text-secondary mb-4">
                Sign out from all other devices and browsers where you're logged in.
              </p>
              <Button 
                variant="secondary"
                onClick={handleLogoutAll}
                isLoading={isLoggingOutAll}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out Other Devices
              </Button>
            </Card>

            <Card className="p-6 border-2 border-error/30">
              <h2 className="text-lg font-semibold text-error mb-2">Danger Zone</h2>
              <p className="text-sm text-text-secondary mb-4">
                Sign out of your current session
              </p>
              <Button 
                variant="danger" 
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Log Out
              </Button>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
