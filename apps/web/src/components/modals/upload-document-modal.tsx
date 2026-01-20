'use client';

import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, File, X, FileText, Image, FileSpreadsheet } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api/client';
import toast from 'react-hot-toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  familyId: string;
}

const DOCUMENT_CATEGORIES = [
  { value: 'medical_record', label: 'Medical Record' },
  { value: 'lab_result', label: 'Lab Result' },
  { value: 'prescription', label: 'Prescription' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'legal', label: 'Legal Document' },
  { value: 'id', label: 'ID / Card' },
  { value: 'image', label: 'Photo / Image' },
  { value: 'other', label: 'Other' },
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export function UploadDocumentModal({ isOpen, onClose, familyId }: Props) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    category: 'medical_record',
    description: '',
    expirationDate: '',
  });
  const [dragActive, setDragActive] = useState(false);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      return api.upload(`/families/${familyId}/documents`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', familyId] });
      toast.success('Document uploaded successfully');
      onClose();
      resetForm();
    },
    onError: () => {
      toast.error('Failed to upload document');
    },
  });

  const resetForm = () => {
    setFile(null);
    setFormData({
      title: '',
      category: 'medical_record',
      description: '',
      expirationDate: '',
    });
  };

  const handleFileSelect = (selectedFile: File) => {
    if (selectedFile.size > MAX_FILE_SIZE) {
      toast.error('File size must be less than 10MB');
      return;
    }

    if (!ALLOWED_TYPES.includes(selectedFile.type)) {
      toast.error('File type not supported');
      return;
    }

    setFile(selectedFile);
    if (!formData.title) {
      setFormData({ ...formData, title: selectedFile.name.replace(/\.[^/.]+$/, '') });
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    const data = new FormData();
    data.append('file', file);
    data.append('title', formData.title);
    data.append('category', formData.category);
    data.append('description', formData.description);
    if (formData.expirationDate) {
      data.append('expirationDate', formData.expirationDate);
    }

    mutation.mutate(data);
  };

  const getFileIcon = () => {
    if (!file) return <Upload className="w-10 h-10 text-text-tertiary" />;
    
    if (file.type.startsWith('image/')) {
      return <Image className="w-10 h-10 text-info" />;
    }
    if (file.type === 'application/pdf') {
      return <FileText className="w-10 h-10 text-error" />;
    }
    return <FileSpreadsheet className="w-10 h-10 text-accent-primary" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Upload Document" size="md">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* File Drop Zone */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
            ${dragActive ? 'border-accent-primary bg-accent-primary-light' : 'border-border hover:border-accent-primary'}
            ${file ? 'bg-bg-muted' : 'bg-bg-surface'}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_TYPES.join(',')}
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            className="hidden"
          />
          
          {file ? (
            <div className="flex items-center justify-center gap-4">
              {getFileIcon()}
              <div className="text-left">
                <p className="font-medium text-text-primary">{file.name}</p>
                <p className="text-sm text-text-tertiary">{formatFileSize(file.size)}</p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                }}
                className="p-2 hover:bg-bg-subtle rounded-lg"
              >
                <X className="w-5 h-5 text-text-secondary" />
              </button>
            </div>
          ) : (
            <>
              {getFileIcon()}
              <p className="mt-4 text-text-primary font-medium">
                Drop file here or click to upload
              </p>
              <p className="mt-1 text-sm text-text-tertiary">
                PDF, Images, Word documents up to 10MB
              </p>
            </>
          )}
        </div>

        {/* Title */}
        <Input
          label="Document Title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="e.g., Lab Results - January 2025"
          required
        />

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Category
          </label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full px-4 py-3 rounded-lg border border-border bg-bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 focus:border-accent-primary"
          >
            {DOCUMENT_CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Description (optional)
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-3 rounded-lg border border-border bg-bg-surface text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 focus:border-accent-primary resize-none"
            rows={2}
            placeholder="Brief description of the document..."
          />
        </div>

        {/* Expiration Date */}
        <Input
          label="Expiration Date (optional)"
          type="date"
          value={formData.expirationDate}
          onChange={(e) => setFormData({ ...formData, expirationDate: e.target.value })}
        />

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="primary" 
            isLoading={mutation.isPending}
            disabled={!file}
          >
            Upload Document
          </Button>
        </div>
      </form>
    </Modal>
  );
}

