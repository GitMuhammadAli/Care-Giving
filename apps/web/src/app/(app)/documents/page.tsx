'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn, formatRelativeTime } from '@/lib/utils';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
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
} from 'lucide-react';

const documentCategories = [
  { value: 'all', label: 'All Documents', icon: FolderOpen },
  { value: 'INSURANCE', label: 'Insurance', icon: CreditCard },
  { value: 'MEDICAL_RECORD', label: 'Medical Records', icon: FileText },
  { value: 'LEGAL', label: 'Legal', icon: Scale },
  { value: 'ID', label: 'ID Documents', icon: Shield },
  { value: 'PRESCRIPTION', label: 'Prescriptions', icon: Stethoscope },
];

const mockDocuments = [
  {
    id: 'doc-1',
    name: 'BlueCross Insurance Card',
    type: 'INSURANCE',
    mimeType: 'image/jpeg',
    size: '245 KB',
    uploadedAt: new Date(Date.now() - 30 * 24 * 60 * 60000).toISOString(),
    uploadedBy: 'Sarah Thompson',
    expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60000).toISOString(),
  },
  {
    id: 'doc-2',
    name: 'Medicare Card',
    type: 'INSURANCE',
    mimeType: 'image/jpeg',
    size: '198 KB',
    uploadedAt: new Date(Date.now() - 45 * 24 * 60 * 60000).toISOString(),
    uploadedBy: 'Mike Thompson',
    expiresAt: null,
  },
  {
    id: 'doc-3',
    name: 'Last Cardiology Visit Summary',
    type: 'MEDICAL_RECORD',
    mimeType: 'application/pdf',
    size: '1.2 MB',
    uploadedAt: new Date(Date.now() - 7 * 24 * 60 * 60000).toISOString(),
    uploadedBy: 'Sarah Thompson',
    expiresAt: null,
  },
  {
    id: 'doc-4',
    name: 'Power of Attorney',
    type: 'LEGAL',
    mimeType: 'application/pdf',
    size: '2.8 MB',
    uploadedAt: new Date(Date.now() - 90 * 24 * 60 * 60000).toISOString(),
    uploadedBy: 'Sarah Thompson',
    expiresAt: null,
  },
  {
    id: 'doc-5',
    name: 'Driver License',
    type: 'ID',
    mimeType: 'image/jpeg',
    size: '156 KB',
    uploadedAt: new Date(Date.now() - 60 * 24 * 60 * 60000).toISOString(),
    uploadedBy: 'Mike Thompson',
    expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60000).toISOString(),
    expiringSoon: true,
  },
  {
    id: 'doc-6',
    name: 'Metformin Prescription',
    type: 'PRESCRIPTION',
    mimeType: 'application/pdf',
    size: '89 KB',
    uploadedAt: new Date(Date.now() - 14 * 24 * 60 * 60000).toISOString(),
    uploadedBy: 'Sarah Thompson',
    expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60000).toISOString(),
  },
];

const categoryConfig: Record<string, { icon: typeof FileText; color: string; bgColor: string }> = {
  INSURANCE: { icon: CreditCard, color: 'text-info', bgColor: 'bg-info-light' },
  MEDICAL_RECORD: { icon: FileText, color: 'text-accent-primary', bgColor: 'bg-accent-primary-light' },
  LEGAL: { icon: Scale, color: 'text-chart-purple', bgColor: 'bg-chart-purple/10' },
  ID: { icon: Shield, color: 'text-success', bgColor: 'bg-success-light' },
  PRESCRIPTION: { icon: Stethoscope, color: 'text-accent-warm', bgColor: 'bg-accent-warm-light' },
  OTHER: { icon: FileText, color: 'text-text-secondary', bgColor: 'bg-bg-muted' },
};

export default function DocumentsPage() {
  const [category, setCategory] = useState('all');

  const filteredDocuments = mockDocuments.filter((doc) =>
    category === 'all' ? true : doc.type === category
  );

  const expiringDocuments = mockDocuments.filter((doc) => doc.expiringSoon);

  return (
    <div className="pb-6">
      <PageHeader
        title="Documents"
        subtitle="Secure document vault"
        actions={
          <Button variant="primary" size="default" leftIcon={<Upload className="w-4 h-4" />}>
            Upload
          </Button>
        }
      />

      <div className="px-4 sm:px-6 py-6 space-y-6">
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
              ? mockDocuments.length
              : mockDocuments.filter((d) => d.type === cat.value).length;

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
            onAction={() => {}}
          />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocuments.map((doc, index) => {
              const config = categoryConfig[doc.type] || categoryConfig.OTHER;
              const Icon = config.icon;

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
                          {doc.size} • {doc.mimeType.split('/')[1].toUpperCase()}
                        </p>
                        <p className="text-xs text-text-tertiary mt-1">
                          Uploaded {formatRelativeTime(doc.uploadedAt)}
                        </p>
                      </div>
                    </div>

                    {doc.expiringSoon && (
                      <div className="mt-3 flex items-center gap-1.5 text-xs text-warning">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Expires in 60 days</span>
                      </div>
                    )}

                    <div className="flex gap-2 mt-4 pt-4 border-t border-border-subtle">
                      <Button variant="ghost" size="sm" leftIcon={<Eye className="w-4 h-4" />} className="flex-1">
                        View
                      </Button>
                      <Button variant="ghost" size="sm" leftIcon={<Download className="w-4 h-4" />} className="flex-1">
                        Download
                      </Button>
                      <button className="p-2 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-muted transition-colors">
                        <MoreVertical className="w-4 h-4" />
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
              6 documents • 4.7 MB used
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

