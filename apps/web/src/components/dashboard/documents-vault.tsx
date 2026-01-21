'use client';

import { useState } from 'react';
import { FileText, Plus, Upload, Download, Eye, Folder, CreditCard, FileCheck, Shield, Clock, Search, Pencil, Trash2, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentsApi, Document, DocumentType } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';

interface DocumentsVaultProps {
  familyId: string;
}

const typeIcons: Record<string, React.ReactNode> = {
  INSURANCE_CARD: <CreditCard className="w-4 h-4" />,
  PHOTO_ID: <FileText className="w-4 h-4" />,
  MEDICAL_RECORD: <FileCheck className="w-4 h-4" />,
  LAB_RESULT: <FileCheck className="w-4 h-4" />,
  PRESCRIPTION: <FileCheck className="w-4 h-4" />,
  POWER_OF_ATTORNEY: <Shield className="w-4 h-4" />,
  LIVING_WILL: <Shield className="w-4 h-4" />,
  DNR: <Shield className="w-4 h-4" />,
  OTHER: <FileText className="w-4 h-4" />,
};

const typeColors: Record<string, string> = {
  INSURANCE_CARD: 'bg-primary/20 text-primary',
  PHOTO_ID: 'bg-accent text-accent-foreground',
  MEDICAL_RECORD: 'bg-secondary/20 text-secondary-foreground',
  LAB_RESULT: 'bg-secondary/20 text-secondary-foreground',
  PRESCRIPTION: 'bg-secondary/20 text-secondary-foreground',
  POWER_OF_ATTORNEY: 'bg-muted text-muted-foreground',
  LIVING_WILL: 'bg-muted text-muted-foreground',
  DNR: 'bg-muted text-muted-foreground',
  OTHER: 'bg-muted text-muted-foreground',
};

const typeLabels: Record<DocumentType, string> = {
  INSURANCE_CARD: 'Insurance',
  PHOTO_ID: 'Identification',
  MEDICAL_RECORD: 'Medical Records',
  LAB_RESULT: 'Medical Records',
  PRESCRIPTION: 'Medical Records',
  POWER_OF_ATTORNEY: 'Legal',
  LIVING_WILL: 'Legal',
  DNR: 'Legal',
  OTHER: 'Other',
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const DocumentsVault = ({ familyId }: DocumentsVaultProps) => {
  const queryClient = useQueryClient();

  // Fetch documents - auto-refresh when there are processing documents
  const { data: documents, isLoading } = useQuery({
    queryKey: ['documents', familyId],
    queryFn: () => documentsApi.list(familyId),
    enabled: !!familyId,
    refetchInterval: (query) => {
      // Auto-refresh every 3 seconds if there are processing documents
      const docs = query.state.data;
      if (docs?.some((doc) => doc.status === 'PROCESSING')) {
        return 3000;
      }
      return false;
    },
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: (data: { name: string; type: DocumentType; file: File; notes?: string }) =>
      documentsApi.upload(familyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', familyId] });
      toast.success('Document upload started! Processing in background...');
    },
    onError: () => {
      toast.error('Failed to upload document');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: { id: string; name?: string; type?: DocumentType; notes?: string }) =>
      documentsApi.update(familyId, data.id, { name: data.name, type: data.type, notes: data.notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', familyId] });
      toast.success('Document updated successfully!');
      setEditingDoc(null);
    },
    onError: () => {
      toast.error('Failed to update document');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (documentId: string) => documentsApi.delete(familyId, documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', familyId] });
      toast.success('Document deleted successfully!');
      setDeleteConfirmDoc(null);
    },
    onError: () => {
      toast.error('Failed to delete document. Only admins can delete documents.');
    },
  });

  const [uploadOpen, setUploadOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [deleteConfirmDoc, setDeleteConfirmDoc] = useState<Document | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [newDoc, setNewDoc] = useState({
    name: '',
    type: 'OTHER' as DocumentType,
    notes: '',
    file: null as File | null,
  });

  const categories = ['all', 'Insurance', 'Medical Records', 'Legal', 'Identification', 'Other'];

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDoc.file) {
      toast.error('Please select a file');
      return;
    }

    await uploadMutation.mutateAsync({
      name: newDoc.name,
      type: newDoc.type,
      file: newDoc.file,
      notes: newDoc.notes || undefined,
    });

    setNewDoc({ name: '', type: 'OTHER', notes: '', file: null });
    setUploadOpen(false);
  };

  const handleView = async (doc: Document) => {
    try {
      const { viewUrl, mimeType } = await documentsApi.getSignedUrl(familyId, doc.id);

      // For viewable files (images and PDFs), fetch as blob and open with correct MIME type
      // This is needed because Cloudinary's 'raw' resource type doesn't set Content-Type properly
      if (mimeType.startsWith('image/') || mimeType === 'application/pdf') {
        toast.loading('Opening document...', { id: 'view-doc' });

        const response = await fetch(viewUrl);
        const blob = await response.blob();

        // Create a new blob with the correct MIME type
        const typedBlob = new Blob([blob], { type: mimeType });
        const blobUrl = window.URL.createObjectURL(typedBlob);

        // Open in new tab
        window.open(blobUrl, '_blank');

        // Clean up the blob URL after a delay (give time for the new tab to load)
        setTimeout(() => {
          window.URL.revokeObjectURL(blobUrl);
        }, 10000);

        toast.success('Document opened', { id: 'view-doc' });
      } else {
        // For non-viewable files, trigger download
        handleDownload(doc);
      }
    } catch (error) {
      toast.error('Failed to open document', { id: 'view-doc' });
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      toast.loading('Preparing download...', { id: 'download-doc' });

      const { downloadUrl, filename, mimeType } = await documentsApi.getSignedUrl(familyId, doc.id);

      // Fetch the file as blob for proper download
      const response = await fetch(downloadUrl);
      const blob = await response.blob();

      // Create a new blob with the correct MIME type
      const typedBlob = new Blob([blob], { type: mimeType });

      // Create blob URL and download
      const blobUrl = window.URL.createObjectURL(typedBlob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);

      toast.success(`Downloaded ${filename}`, { id: 'download-doc' });
    } catch (error) {
      toast.error('Failed to download document', { id: 'download-doc' });
    }
  };

  // Filter and group documents
  const filteredDocuments = (documents || []).filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
    const docCategory = typeLabels[doc.type];
    const matchesCategory = selectedCategory === 'all' || docCategory === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const groupedDocuments = filteredDocuments.reduce((acc, doc) => {
    const category = typeLabels[doc.type];
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(doc);
    return acc;
  }, {} as Record<string, Document[]>);

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-8 w-20" />
        </div>
        <Skeleton className="h-10 w-full mb-4" />
        <div className="flex gap-2 mb-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-8 w-24" />
          ))}
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (!documents || documents.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-serif text-xl text-foreground flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Documents
          </h2>
          <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="ghost" className="text-primary hover:text-primary hover:bg-primary/10">
                <Upload className="w-4 h-4 mr-1" />
                Upload
              </Button>
            </DialogTrigger>
            <UploadFormDialog
              newDoc={newDoc}
              setNewDoc={setNewDoc}
              onSubmit={handleUpload}
              isLoading={uploadMutation.isPending}
            />
          </Dialog>
        </div>
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-primary/60" />
          </div>
          <h3 className="font-medium text-foreground mb-2">No documents yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Upload insurance cards, medical records, and important documents</p>
          <Button onClick={() => setUploadOpen(true)} className="rounded-xl">
            <Upload className="w-4 h-4 mr-2" />
            Upload First Document
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-serif text-xl text-foreground flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          Documents
        </h2>
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="ghost" className="text-primary hover:text-primary hover:bg-primary/10">
              <Upload className="w-4 h-4 mr-1" />
              Upload
            </Button>
          </DialogTrigger>
          <UploadFormDialog
            newDoc={newDoc}
            setNewDoc={setNewDoc}
            onSubmit={handleUpload}
            isLoading={uploadMutation.isPending}
          />
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search documents..."
          className="pl-9"
        />
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              selectedCategory === category
                ? 'bg-primary text-primary-foreground'
                : 'bg-accent/50 text-muted-foreground hover:bg-accent'
            }`}
          >
            {category === 'all' ? 'All' : category}
          </button>
        ))}
      </div>

      {/* Documents List */}
      <div className="space-y-4 max-h-80 overflow-y-auto">
        {Object.entries(groupedDocuments).map(([category, docs]) => (
          <div key={category}>
            <div className="flex items-center gap-2 mb-2">
              <Folder className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">{category}</span>
              <span className="text-xs text-muted-foreground">({docs.length})</span>
            </div>
            <div className="space-y-2 pl-6">
              {docs.map((doc) => {
                const isProcessing = doc.status === 'PROCESSING';
                const isFailed = doc.status === 'FAILED';
                const isReady = doc.status === 'READY';

                return (
                  <div
                    key={doc.id}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors border group ${
                      isProcessing
                        ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800'
                        : isFailed
                          ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
                          : 'bg-accent/50 hover:bg-accent border-transparent hover:border-border'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isProcessing
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-600'
                        : isFailed
                          ? 'bg-red-100 dark:bg-red-900 text-red-600'
                          : typeColors[doc.type]
                    }`}>
                      {isProcessing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : isFailed ? (
                        <AlertCircle className="w-4 h-4" />
                      ) : (
                        typeIcons[doc.type]
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">{doc.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {isProcessing ? (
                          <span className="text-blue-600 dark:text-blue-400 font-medium">Uploading...</span>
                        ) : isFailed ? (
                          <span className="text-red-600 dark:text-red-400 font-medium">Upload failed</span>
                        ) : (
                          <>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDate(doc.createdAt)}
                            </span>
                            <span>•</span>
                            <span>{formatFileSize(doc.sizeBytes)}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className={`flex items-center gap-1 ${isReady ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'} transition-opacity`}>
                      {isProcessing ? (
                        <span className="text-xs text-blue-600 dark:text-blue-400 px-2">Processing...</span>
                      ) : isFailed ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:text-red-700"
                          onClick={() => setDeleteConfirmDoc(doc)}
                          title="Remove failed upload"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleView(doc)}
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleDownload(doc)}
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setEditingDoc(doc)}
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteConfirmDoc(doc)}
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <Button variant="ghost" className="w-full mt-4 text-primary hover:text-primary hover:bg-primary/10">
        View All Documents
      </Button>

      {/* Edit Document Dialog */}
      <Dialog open={!!editingDoc} onOpenChange={(open) => !open && setEditingDoc(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">Edit Document</DialogTitle>
          </DialogHeader>
          {editingDoc && (
            <EditDocumentForm
              doc={editingDoc}
              onSubmit={(data) => updateMutation.mutate({ id: editingDoc.id, ...data })}
              onCancel={() => setEditingDoc(null)}
              isLoading={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmDoc} onOpenChange={(open) => !open && setDeleteConfirmDoc(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">Delete Document</DialogTitle>
          </DialogHeader>
          {deleteConfirmDoc && (
            <div className="space-y-4 mt-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete <span className="font-medium text-foreground">{deleteConfirmDoc.name}</span>? This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setDeleteConfirmDoc(null)}
                  disabled={deleteMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => deleteMutation.mutate(deleteConfirmDoc.id)}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Upload form dialog
function UploadFormDialog({
  newDoc,
  setNewDoc,
  onSubmit,
  isLoading,
}: {
  newDoc: {
    name: string;
    type: DocumentType;
    notes: string;
    file: File | null;
  };
  setNewDoc: (doc: typeof newDoc) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
}) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewDoc({
        ...newDoc,
        file,
        name: newDoc.name || file.name.replace(/\.[^/.]+$/, ''),
      });
    }
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="font-serif">Upload Document</DialogTitle>
      </DialogHeader>
      <form onSubmit={onSubmit} className="space-y-4 mt-4">
        <div
          className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer relative"
          onClick={() => document.getElementById('file-upload')?.click()}
        >
          <input
            id="file-upload"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md,.csv,.rtf,.odt,.ods,.odp,.zip,.rar,.7z"
            onChange={handleFileChange}
            className="hidden"
          />
          <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          {newDoc.file ? (
            <p className="text-sm text-foreground font-medium">{newDoc.file.name}</p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Drag and drop or click to upload
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PDF, Images, Word, Excel, PowerPoint, Text, and more
              </p>
            </>
          )}
        </div>
        <div>
          <label className="text-sm font-medium text-foreground block mb-2">Document Name</label>
          <Input
            value={newDoc.name}
            onChange={(e) => setNewDoc({ ...newDoc, name: e.target.value })}
            placeholder="Enter document name"
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground block mb-2">Category</label>
          <select
            value={newDoc.type}
            onChange={(e) => setNewDoc({ ...newDoc, type: e.target.value as DocumentType })}
            className="w-full h-10 px-3 rounded-md border border-border bg-background text-foreground"
          >
            <option value="INSURANCE_CARD">Insurance</option>
            <option value="MEDICAL_RECORD">Medical Records</option>
            <option value="LAB_RESULT">Lab Results</option>
            <option value="PRESCRIPTION">Prescription</option>
            <option value="POWER_OF_ATTORNEY">Power of Attorney</option>
            <option value="LIVING_WILL">Living Will</option>
            <option value="PHOTO_ID">Identification</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-foreground block mb-2">Notes (optional)</label>
          <Input
            value={newDoc.notes}
            onChange={(e) => setNewDoc({ ...newDoc, notes: e.target.value })}
            placeholder="Any additional notes..."
          />
        </div>
        <Button type="submit" className="w-full" disabled={isLoading || !newDoc.file}>
          {isLoading ? 'Uploading...' : 'Upload Document'}
        </Button>
      </form>
    </DialogContent>
  );
}

// Edit document form
function EditDocumentForm({
  doc,
  onSubmit,
  onCancel,
  isLoading,
}: {
  doc: Document;
  onSubmit: (data: { name?: string; type?: DocumentType; notes?: string }) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [name, setName] = useState(doc.name);
  const [type, setType] = useState<DocumentType>(doc.type);
  const [notes, setNotes] = useState(doc.notes || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name, type, notes: notes || undefined });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
      <div>
        <label className="text-sm font-medium text-foreground block mb-2">Document Name</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter document name"
          required
        />
      </div>
      <div>
        <label className="text-sm font-medium text-foreground block mb-2">Category</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as DocumentType)}
          className="w-full h-10 px-3 rounded-md border border-border bg-background text-foreground"
        >
          <option value="INSURANCE_CARD">Insurance</option>
          <option value="MEDICAL_RECORD">Medical Records</option>
          <option value="LAB_RESULT">Lab Results</option>
          <option value="PRESCRIPTION">Prescription</option>
          <option value="POWER_OF_ATTORNEY">Power of Attorney</option>
          <option value="LIVING_WILL">Living Will</option>
          <option value="PHOTO_ID">Identification</option>
          <option value="OTHER">Other</option>
        </select>
      </div>
      <div>
        <label className="text-sm font-medium text-foreground block mb-2">Notes (optional)</label>
        <Input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any additional notes..."
        />
      </div>
      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}

