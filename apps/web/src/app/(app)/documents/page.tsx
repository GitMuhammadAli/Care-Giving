'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { cn, formatRelativeTime } from '@/lib/utils';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { FamilySpaceSelector } from '@/components/layout/family-space-selector';
import { useFamilySpace } from '@/contexts/family-space-context';
import { documentsApi, Document } from '@/lib/api';
import {
  Plus,
  FileText,
  CreditCard,
  Shield,
  Stethoscope,
  Scale,
  Upload,
  Download,
  Eye,
  MoreVertical,
  Clock,
  AlertCircle,
  FolderOpen,
  Trash2,
} from 'lucide-react';
import { UploadDocumentModal } from '@/components/modals/upload-document-modal';
import { differenceInDays, parseISO } from 'date-fns';

const documentCategories = [
  { value: 'all', label: 'All Documents', icon: FolderOpen },
  { value: 'INSURANCE_CARD', label: 'Insurance', icon: CreditCard },
  { value: 'MEDICAL_RECORD', label: 'Medical Records', icon: FileText },
  { value: 'POWER_OF_ATTORNEY', label: 'Legal', icon: Scale },
  { value: 'PHOTO_ID', label: 'ID Documents', icon: Shield },
  { value: 'PRESCRIPTION', label: 'Prescriptions', icon: Stethoscope },
];

const categoryConfig: Record<string, { icon: typeof FileText; color: string; bgColor: string }> = {
  INSURANCE_CARD: { icon: CreditCard, color: 'text-info', bgColor: 'bg-info-light' },
  MEDICAL_RECORD: { icon: FileText, color: 'text-accent-primary', bgColor: 'bg-accent-primary-light' },
  LAB_RESULT: { icon: FileText, color: 'text-accent-primary', bgColor: 'bg-accent-primary-light' },
  POWER_OF_ATTORNEY: { icon: Scale, color: 'text-chart-purple', bgColor: 'bg-chart-purple/10' },
  LIVING_WILL: { icon: Scale, color: 'text-chart-purple', bgColor: 'bg-chart-purple/10' },
  DNR: { icon: Scale, color: 'text-chart-purple', bgColor: 'bg-chart-purple/10' },
  PHOTO_ID: { icon: Shield, color: 'text-success', bgColor: 'bg-success-light' },
  PRESCRIPTION: { icon: Stethoscope, color: 'text-accent-warm', bgColor: 'bg-accent-warm-light' },
  OTHER: { icon: FileText, color: 'text-text-secondary', bgColor: 'bg-bg-muted' },
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentsPage() {
  const { selectedFamilyId: familyId } = useFamilySpace();
  const queryClient = useQueryClient();

  const [category, setCategory] = useState('all');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Fetch all documents
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents', familyId],
    queryFn: () => documentsApi.list(familyId!),
    enabled: !!familyId,
  });

  // Delete document mutation
  const deleteDocumentMutation = useMutation({
    mutationFn: (docId: string) => documentsApi.delete(familyId!, docId),
    onSuccess: () => {
      toast.success('Document deleted');
      queryClient.invalidateQueries({ queryKey: ['documents', familyId] });
    },
    onError: () => {
      toast.error('Failed to delete document');
    },
  });

  // Filter documents by category
  const filteredDocuments = useMemo(() => 
    documents.filter((doc) => category === 'all' ? true : doc.type === category),
    [documents, category]
  );

  // Find documents expiring within 60 days
  const expiringDocuments = useMemo(() => 
    documents.filter((doc) => {
      if (!doc.expiresAt) return false;
      const daysUntilExpiry = differenceInDays(parseISO(doc.expiresAt), new Date());
      return daysUntilExpiry > 0 && daysUntilExpiry <= 60;
    }),
    [documents]
  );

  // Get total storage used
  const totalSize = useMemo(() => 
    documents.reduce((sum, doc) => sum + doc.sizeBytes, 0),
    [documents]
  );

  const handleViewDocument = async (docId: string) => {
    try {
      const { url } = await documentsApi.getSignedUrl(familyId!, docId);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Failed to get document URL:', error);
    }
  };

  const handleDownloadDocument = async (docId: string, docName: string) => {
    try {
      const { url } = await documentsApi.getSignedUrl(familyId!, docId);
      const link = document.createElement('a');
      link.href = url;
      link.download = docName;
      link.click();
    } catch (error) {
      console.error('Failed to download document:', error);
    }
  };

  if (!familyId) {
    return (
      <div className="pb-6">
        <PageHeader title="Documents" subtitle="Secure document vault" />
        <div className="px-4 sm:px-6 py-6">
          <FamilySpaceSelector />
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-warning mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-text-primary mb-2">No Family Selected</h2>
            <p className="text-text-secondary">Please select a family above to view documents.</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="pb-6">
        <PageHeader title="Documents" subtitle="Secure document vault" />
        <div className="px-4 sm:px-6 py-6 space-y-6">
          <FamilySpaceSelector />
          <div className="flex gap-2 overflow-x-auto">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-10 w-32 rounded-full flex-shrink-0" />
            ))}
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-40 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-6">
      <PageHeader
        title="Documents"
        subtitle="Secure document vault"
        actions={
          <Button
            variant="primary"
            size="default"
            leftIcon={<Upload className="w-4 h-4" />}
            onClick={() => setIsUploadModalOpen(true)}
          >
            Upload
          </Button>
        }
      />

      <div className="px-4 sm:px-6 py-6 space-y-6">
        {/* Family Space Selector */}
        <FamilySpaceSelector />

        {/* Expiring Soon Alert */}
        {expiringDocuments.length > 0 && (
          <Card variant="highlighted">
            <CardContent className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning-light flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-warning" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-text-primary">
                  {expiringDocuments.length} document{expiringDocuments.length > 1 ? 's' : ''} expiring soon
                </p>
                <p className="text-xs text-text-secondary">
                  {expiringDocuments.map((d) => d.name).join(', ')}
                </p>
              </div>
              <Button variant="ghost" size="sm">View</Button>
            </CardContent>
          </Card>
        )}

        {/* Category Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {documentCategories.map((cat) => {
            const Icon = cat.icon;
            const isActive = category === cat.value;
            const count = cat.value === 'all'
              ? documents.length
              : documents.filter((d) => d.type === cat.value).length;

            return (
              <button
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap',
                  'border transition-all',
                  isActive
                    ? 'bg-accent-primary text-text-inverse border-accent-primary'
                    : 'bg-bg-surface text-text-secondary border-border-default hover:border-border-strong'
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{cat.label}</span>
                <span className={cn(
                  'text-xs px-1.5 py-0.5 rounded-full',
                  isActive ? 'bg-text-inverse/20' : 'bg-bg-muted'
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Documents Grid */}
        {filteredDocuments.length === 0 ? (
          <EmptyState
            type="documents"
            title="No documents yet"
            description="Upload important documents like insurance cards, medical records, and legal documents to keep them secure and accessible."
            actionLabel="Upload Document"
            onAction={() => setIsUploadModalOpen(true)}
          />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocuments.map((doc, index) => {
              const config = categoryConfig[doc.type] || categoryConfig.OTHER;
              const Icon = config.icon;
              const daysUntilExpiry = doc.expiresAt 
                ? differenceInDays(parseISO(doc.expiresAt), new Date())
                : null;
              const expiringSoon = daysUntilExpiry !== null && daysUntilExpiry > 0 && daysUntilExpiry <= 60;

              return (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card variant="interactive" className="h-full">
                    <div className="flex items-start gap-3">
                      <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0', config.bgColor)}>
                        <Icon className={cn('w-6 h-6', config.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-text-primary truncate">{doc.name}</h4>
                        <p className="text-sm text-text-secondary mt-0.5">
                          {formatFileSize(doc.sizeBytes)} • {doc.mimeType.split('/')[1]?.toUpperCase() || 'FILE'}
                        </p>
                        <p className="text-xs text-text-tertiary mt-1">
                          Uploaded {formatRelativeTime(doc.createdAt)}
                        </p>
                      </div>
                    </div>

                    {expiringSoon && daysUntilExpiry && (
                      <div className="mt-3 flex items-center gap-1.5 text-xs text-warning">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Expires in {daysUntilExpiry} days</span>
                      </div>
                    )}

                    <div className="flex gap-2 mt-4 pt-4 border-t border-border-subtle">
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<Eye className="w-4 h-4" />}
                        className="flex-1"
                        onClick={() => handleViewDocument(doc.id)}
                      >
                        View
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<Download className="w-4 h-4" />}
                        className="flex-1"
                        onClick={() => handleDownloadDocument(doc.id, doc.name)}
                      >
                        Download
                      </Button>
                      <button
                        className="p-2 rounded-lg text-text-tertiary hover:text-destructive hover:bg-destructive/10 transition-colors"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this document?')) {
                            deleteDocumentMutation.mutate(doc.id);
                          }
                        }}
                        disabled={deleteDocumentMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Storage Info */}
        <Card>
          <CardContent className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-success" />
              <div>
                <p className="text-sm font-medium text-text-primary">End-to-end encrypted</p>
                <p className="text-xs text-text-secondary">Your documents are securely stored</p>
              </div>
            </div>
            <p className="text-sm text-text-secondary">
              {documents.length} document{documents.length !== 1 ? 's' : ''} • {formatFileSize(totalSize)} used
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Upload Document Modal */}
      {familyId && (
        <UploadDocumentModal
          isOpen={isUploadModalOpen}
          onClose={() => {
            setIsUploadModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ['documents', familyId] });
          }}
          familyId={familyId}
        />
      )}
    </div>
  );
}

