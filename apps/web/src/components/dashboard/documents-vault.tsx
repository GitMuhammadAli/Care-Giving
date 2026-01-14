'use client';

import { useState } from 'react';
import { FileText, Plus, Upload, Download, Eye, Folder, CreditCard, FileCheck, Shield, Clock, Search } from 'lucide-react';
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
  careRecipientId: string;
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

export const DocumentsVault = ({ careRecipientId }: DocumentsVaultProps) => {
  const queryClient = useQueryClient();

  // Fetch documents
  const { data: documents, isLoading } = useQuery({
    queryKey: ['documents', careRecipientId],
    queryFn: () => documentsApi.list(careRecipientId),
    enabled: !!careRecipientId,
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: (data: { name: string; type: DocumentType; file: File; notes?: string }) =>
      documentsApi.upload(careRecipientId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', careRecipientId] });
      toast.success('Document uploaded successfully!');
    },
    onError: () => {
      toast.error('Failed to upload document');
    },
  });

  const [uploadOpen, setUploadOpen] = useState(false);
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
      const { url } = await documentsApi.getSignedUrl(careRecipientId, doc.id);
      window.open(url, '_blank');
    } catch (error) {
      toast.error('Failed to open document');
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      const { url } = await documentsApi.getSignedUrl(careRecipientId, doc.id);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.name;
      link.click();
      toast.success(`Downloading ${doc.name}...`);
    } catch (error) {
      toast.error('Failed to download document');
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
              {docs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-accent/50 hover:bg-accent transition-colors border border-transparent hover:border-border group"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${typeColors[doc.type]}`}>
                    {typeIcons[doc.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">{doc.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(doc.createdAt)}
                      </span>
                      <span>•</span>
                      <span>{formatFileSize(doc.sizeBytes)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleView(doc)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDownload(doc)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Button variant="ghost" className="w-full mt-4 text-primary hover:text-primary hover:bg-primary/10">
        View All Documents
      </Button>
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
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
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
                PDF, JPG, PNG up to 10MB
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

