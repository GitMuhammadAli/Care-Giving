'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Download, FileJson, AlertTriangle, Trash2, Loader2, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface DataExportProps {
  className?: string;
}

export function DataExport({ className }: DataExportProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const { token, user, logout } = useAuth();

  // Export data mutation
  const exportMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/user/export/download`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to export data');
      }

      // Get the blob and create a download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `carecircle-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
  });

  // Delete account mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/user/delete-account`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to delete account');
      }

      return response.json();
    },
    onSuccess: () => {
      // Log out after account deletion
      setTimeout(() => {
        logout();
      }, 2000);
    },
  });

  const handleDeleteAccount = () => {
    if (deleteInput === 'DELETE MY ACCOUNT') {
      deleteMutation.mutate();
    }
  };

  return (
    <div className={className}>
      {/* Data Export Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileJson className="h-5 w-5 text-primary" />
            Export Your Data
          </CardTitle>
          <CardDescription>
            Download a copy of all your CareCircle data in JSON format.
            This includes your profile, family memberships, care recipients, 
            medications, appointments, and more.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-sm">Your export will include:</h4>
            <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Profile information</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Family memberships</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Care recipients</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Medications & logs</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Appointments</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Timeline entries</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Notifications</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Session history</span>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            onClick={() => exportMutation.mutate()}
            disabled={exportMutation.isPending}
          >
            {exportMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Preparing Export...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Download My Data
              </>
            )}
          </Button>
          {exportMutation.isSuccess && (
            <span className="ml-4 text-sm text-green-600">
              ✓ Download started
            </span>
          )}
          {exportMutation.isError && (
            <span className="ml-4 text-sm text-red-600">
              Failed to export. Please try again.
            </span>
          )}
        </CardFooter>
      </Card>

      {/* GDPR Info */}
      <Card className="mb-6 border-blue-200 bg-blue-50/30">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Badge variant="outline" className="bg-blue-100">GDPR</Badge>
            Your Data Rights
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            Under the General Data Protection Regulation (GDPR), you have the right to:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>Access</strong> your personal data (export above)</li>
            <li><strong>Rectify</strong> inaccurate data (edit your profile)</li>
            <li><strong>Erase</strong> your data (delete account below)</li>
            <li><strong>Data portability</strong> (JSON export above)</li>
          </ul>
          <p className="text-xs pt-2">
            For questions about your data, contact support@carecircle.com
          </p>
        </CardContent>
      </Card>

      {/* Delete Account Section */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="h-5 w-5" />
            Delete Account
          </CardTitle>
          <CardDescription>
            Permanently delete your account and all associated data.
            This action cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {deleteMutation.isSuccess ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="font-medium text-green-700">Account Deleted</p>
              <p className="text-sm text-green-600 mt-1">
                You will be logged out shortly...
              </p>
            </div>
          ) : (
            <>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <div className="flex gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
                  <div className="text-sm text-red-700">
                    <p className="font-medium mb-1">Warning: This is irreversible</p>
                    <ul className="list-disc list-inside space-y-1 text-red-600">
                      <li>All your personal data will be anonymized</li>
                      <li>You will lose access to all families</li>
                      <li>Your medication logs and timeline entries will be orphaned</li>
                      <li>You cannot recover this account</li>
                    </ul>
                  </div>
                </div>
              </div>

              {!showDeleteConfirm ? (
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete My Account
                </Button>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm font-medium">
                    Type <span className="font-mono bg-muted px-1 py-0.5 rounded">DELETE MY ACCOUNT</span> to confirm:
                  </p>
                  <input
                    type="text"
                    value={deleteInput}
                    onChange={(e) => setDeleteInput(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Type DELETE MY ACCOUNT"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      onClick={handleDeleteAccount}
                      disabled={deleteInput !== 'DELETE MY ACCOUNT' || deleteMutation.isPending}
                    >
                      {deleteMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        'Permanently Delete'
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setDeleteInput('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                  {deleteMutation.isError && (
                    <p className="text-sm text-red-600">
                      Failed to delete account. Please try again later.
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default DataExport;

