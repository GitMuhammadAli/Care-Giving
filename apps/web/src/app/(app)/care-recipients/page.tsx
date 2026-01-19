'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Heart,
  Plus,
  ChevronRight,
  Pencil,
  Trash2,
  AlertTriangle,
  Users,
  Calendar,
  Droplets,
  Home,
  MoreHorizontal,
  Settings,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/layout/page-header';
import { AddCareRecipientModal } from '@/components/modals/add-care-recipient-modal';
import { EditCareRecipientModal } from '@/components/modals/edit-care-recipient-modal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/use-auth';
import { useCreateFamily, useUpdateFamily, useDeleteFamily } from '@/hooks/use-family';
import { careRecipientsApi, CareRecipient } from '@/lib/api';
import toast from 'react-hot-toast';

export default function CareRecipientsPage() {
  const { user, refetchUser } = useAuth();
  const queryClient = useQueryClient();

  // Get all families the user is a member of
  const families = user?.families || [];

  // Family Space CRUD hooks
  const createFamily = useCreateFamily();
  const updateFamily = useUpdateFamily();
  const deleteFamily = useDeleteFamily();

  // State for family space modals
  const [createSpaceModalOpen, setCreateSpaceModalOpen] = useState(false);
  const [editSpaceModalOpen, setEditSpaceModalOpen] = useState(false);
  const [deleteSpaceDialogOpen, setDeleteSpaceDialogOpen] = useState(false);
  const [selectedSpace, setSelectedSpace] = useState<{ id: string; name: string; role: string } | null>(null);
  const [newSpaceName, setNewSpaceName] = useState('');
  const [editSpaceName, setEditSpaceName] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // State for care recipient modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);
  const [selectedCareRecipient, setSelectedCareRecipient] = useState<CareRecipient | null>(null);

  // Fetch care recipients for all families
  const { data: allCareRecipients, isLoading } = useQuery({
    queryKey: ['all-care-recipients', families.map((f: any) => f.id)],
    queryFn: async () => {
      const results = await Promise.all(
        families.map(async (family: any) => {
          try {
            const recipients = await careRecipientsApi.list(family.id);
            return recipients.map((r) => ({ ...r, familyName: family.name, familyId: family.id }));
          } catch {
            return [];
          }
        })
      );
      return results.flat();
    },
    enabled: families.length > 0,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => careRecipientsApi.delete(id),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['all-care-recipients'] });
      queryClient.invalidateQueries({ queryKey: ['care-recipients'] });
      queryClient.invalidateQueries({ queryKey: ['families'] });
      await refetchUser();
      toast.success('Care recipient removed');
      setDeleteDialogOpen(false);
      setSelectedCareRecipient(null);
    },
    onError: () => {
      toast.error('Failed to remove care recipient');
    },
  });

  const handleAddClick = (familyId: string) => {
    setSelectedFamilyId(familyId);
    setAddModalOpen(true);
  };

  const handleEditClick = (careRecipient: CareRecipient) => {
    setSelectedCareRecipient(careRecipient);
    setEditModalOpen(true);
  };

  const handleDeleteClick = (careRecipient: CareRecipient) => {
    setSelectedCareRecipient(careRecipient);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (selectedCareRecipient) {
      deleteMutation.mutate(selectedCareRecipient.id);
    }
  };

  // Family Space handlers
  const handleCreateSpace = async () => {
    if (!newSpaceName.trim()) return;
    await createFamily.mutateAsync({ name: newSpaceName.trim() });
    setNewSpaceName('');
    setCreateSpaceModalOpen(false);
  };

  const handleEditSpaceClick = (family: { id: string; name: string; role: string }) => {
    setSelectedSpace(family);
    setEditSpaceName(family.name);
    setEditSpaceModalOpen(true);
  };

  const handleUpdateSpace = async () => {
    if (!selectedSpace || !editSpaceName.trim()) return;
    await updateFamily.mutateAsync({ id: selectedSpace.id, data: { name: editSpaceName.trim() } });
    setEditSpaceModalOpen(false);
    setSelectedSpace(null);
    setEditSpaceName('');
  };

  const handleDeleteSpaceClick = (family: { id: string; name: string; role: string }) => {
    setSelectedSpace(family);
    setDeleteSpaceDialogOpen(true);
  };

  const handleDeleteSpace = async () => {
    if (!selectedSpace || deleteConfirmText !== selectedSpace.name) return;
    await deleteFamily.mutateAsync(selectedSpace.id);
    setDeleteSpaceDialogOpen(false);
    setSelectedSpace(null);
    setDeleteConfirmText('');
  };

  const calculateAge = (dateOfBirth?: string): number | null => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  if (isLoading) {
    return (
      <div className="container max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-6 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-56 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // Group care recipients by family
  const careRecipientsByFamily = families.map((family: any) => ({
    family,
    recipients: (allCareRecipients || []).filter((r: any) => r.familyId === family.id),
  }));

  return (
    <div className="container max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-8 pb-24">
      <PageHeader
        title="Loved Ones"
        subtitle="Manage your family spaces and the people you care for"
      />

      {/* Family Spaces Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Home className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground">Family Spaces</h2>
          </div>
          <Button onClick={() => setCreateSpaceModalOpen(true)} size="sm" className="rounded-xl">
            <Plus className="w-4 h-4 mr-1" />
            New Space
          </Button>
        </div>

        {families.length === 0 ? (
          <Card className="p-8 text-center rounded-2xl border-dashed bg-card/50">
            <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <Home className="w-6 h-6 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No Family Spaces Yet</h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto text-sm">
              Create a family space to organize care for your loved ones. You can have multiple spaces for different families.
            </p>
            <Button onClick={() => setCreateSpaceModalOpen(true)} className="rounded-xl">
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Space
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {families.map((family: any) => {
              const recipientCount = (allCareRecipients || []).filter((r: any) => r.familyId === family.id).length;
              const isAdmin = family.role === 'ADMIN';

              return (
                <Card key={family.id} className="p-4 rounded-xl hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Home className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{family.name}</h3>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{recipientCount} loved one{recipientCount !== 1 ? 's' : ''}</span>
                          <span>•</span>
                          <Badge variant={isAdmin ? 'default' : 'secondary'} className="text-xs py-0">
                            {family.role}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {isAdmin && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40 rounded-xl">
                          <DropdownMenuItem
                            onClick={() => handleEditSpaceClick(family)}
                            className="cursor-pointer rounded-lg"
                          >
                            <Pencil className="w-4 h-4 mr-2" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeleteSpaceClick(family)}
                            className="cursor-pointer rounded-lg text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-4">
                    <Link href={`/family?space=${family.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full rounded-lg text-xs">
                        <Users className="w-3.5 h-3.5 mr-1" />
                        Members
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddClick(family.id)}
                      className="rounded-lg text-xs"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Add Person
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Loved Ones Section */}
      {families.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Heart className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground">Loved Ones</h2>
          </div>

          {careRecipientsByFamily.map(({ family, recipients }: any) => (
            <Card key={family.id} className="p-6 rounded-2xl mb-4">
              {/* Family Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Heart className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-serif text-xl font-semibold text-foreground">{family.name}</h2>
                    <p className="text-sm text-muted-foreground">
                      {recipients.length} loved one{recipients.length !== 1 ? 's' : ''}
                    </p>
                </div>
              </div>
              <Button onClick={() => handleAddClick(family.id)} className="rounded-xl">
                <Plus className="w-4 h-4 mr-2" />
                Add Person
              </Button>
            </div>

            {/* Care Recipients Grid */}
            {recipients.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-border rounded-xl bg-muted/20">
                <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <Heart className="w-6 h-6 text-muted-foreground/50" />
                </div>
                <p className="text-muted-foreground mb-4">
                  No loved ones added to this family yet
                </p>
                <Button variant="outline" className="rounded-xl" onClick={() => handleAddClick(family.id)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Loved One
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {recipients.map((recipient: any) => (
                  <div
                    key={recipient.id}
                    className="p-5 rounded-xl border border-border bg-background hover:shadow-md transition-all hover:border-primary/30"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                          <Heart className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">
                            {recipient.preferredName || recipient.fullName}
                          </h3>
                          {recipient.preferredName && (
                            <p className="text-sm text-muted-foreground">{recipient.fullName}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="space-y-2 mb-4">
                      {recipient.dateOfBirth && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4 shrink-0" />
                          <span>{calculateAge(recipient.dateOfBirth)} years old</span>
                        </div>
                      )}
                      {recipient.bloodType && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Droplets className="w-4 h-4 shrink-0" />
                          <span>Blood Type: {recipient.bloodType}</span>
                        </div>
                      )}
                    </div>

                    {/* Conditions/Allergies badges */}
                    {(recipient.conditions?.length > 0 || recipient.allergies?.length > 0) && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {recipient.allergies?.slice(0, 2).map((allergy: string, i: number) => (
                          <Badge key={`allergy-${i}`} variant="destructive" className="text-xs rounded-md">
                            {allergy}
                          </Badge>
                        ))}
                        {recipient.conditions?.slice(0, 2).map((condition: string, i: number) => (
                          <Badge key={`condition-${i}`} variant="warning" className="text-xs rounded-md">
                            {condition}
                          </Badge>
                        ))}
                        {(recipient.allergies?.length || 0) + (recipient.conditions?.length || 0) > 4 && (
                          <Badge variant="secondary" className="text-xs rounded-md">
                            +{(recipient.allergies?.length || 0) + (recipient.conditions?.length || 0) - 4} more
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-4 border-t border-border">
                      <Link href={`/care-recipients/${recipient.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full rounded-lg">
                          View Profile
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditClick(recipient)}
                        className="rounded-lg h-9 w-9 p-0"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(recipient)}
                        className="rounded-lg h-9 w-9 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
          ))}
        </section>
      )}

      {/* Create Family Space Modal */}
      <Dialog open={createSpaceModalOpen} onOpenChange={setCreateSpaceModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Family Space</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">Space Name</label>
              <Input
                placeholder="e.g., Smith Family Care"
                value={newSpaceName}
                onChange={(e) => setNewSpaceName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateSpace()}
              />
              <p className="text-xs text-muted-foreground mt-1">
                This will be the name of your care coordination space.
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setCreateSpaceModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateSpace}
                disabled={!newSpaceName.trim() || createFamily.isPending}
              >
                {createFamily.isPending ? 'Creating...' : 'Create Space'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Family Space Modal */}
      <Dialog open={editSpaceModalOpen} onOpenChange={setEditSpaceModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename Family Space</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">Space Name</label>
              <Input
                placeholder="Enter new name"
                value={editSpaceName}
                onChange={(e) => setEditSpaceName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUpdateSpace()}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setEditSpaceModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleUpdateSpace}
                disabled={!editSpaceName.trim() || updateFamily.isPending}
              >
                {updateFamily.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Family Space Dialog */}
      <Dialog open={deleteSpaceDialogOpen} onOpenChange={setDeleteSpaceDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Delete Family Space?
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              This will permanently delete <strong className="text-foreground">{selectedSpace?.name}</strong> and all its data:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 pl-4">
              <li>• All loved ones and their profiles</li>
              <li>• All medications, appointments, and documents</li>
              <li>• All family members will lose access</li>
            </ul>
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                Type <strong>{selectedSpace?.name}</strong> to confirm
              </label>
              <Input
                placeholder={selectedSpace?.name || ''}
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => {
                setDeleteSpaceDialogOpen(false);
                setDeleteConfirmText('');
              }}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteSpace}
                disabled={deleteConfirmText !== selectedSpace?.name || deleteFamily.isPending}
              >
                {deleteFamily.isPending ? 'Deleting...' : 'Delete Forever'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Care Recipient Modal */}
      {selectedFamilyId && (
        <AddCareRecipientModal
          isOpen={addModalOpen}
          onClose={() => {
            setAddModalOpen(false);
            setSelectedFamilyId(null);
          }}
          familyId={selectedFamilyId}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['all-care-recipients'] });
          }}
        />
      )}

      {/* Edit Modal */}
      {selectedCareRecipient && (
        <EditCareRecipientModal
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setSelectedCareRecipient(null);
          }}
          careRecipient={selectedCareRecipient}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Remove Person?
            </DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Are you sure you want to remove{' '}
            <strong className="text-foreground">{selectedCareRecipient?.fullName}</strong>? This action cannot be undone
            and all their data (medications, appointments, documents) will be deleted.
          </p>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Removing...' : 'Remove'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
