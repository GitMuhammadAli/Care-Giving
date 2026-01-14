import { api } from './client';

export type DocumentType =
  | 'INSURANCE_CARD'
  | 'PHOTO_ID'
  | 'MEDICAL_RECORD'
  | 'LAB_RESULT'
  | 'PRESCRIPTION'
  | 'POWER_OF_ATTORNEY'
  | 'LIVING_WILL'
  | 'DNR'
  | 'OTHER';

export interface Document {
  id: string;
  familyId: string;
  uploadedById: string;
  name: string;
  type: DocumentType;
  s3Key: string;
  mimeType: string;
  sizeBytes: number;
  expiresAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UploadDocumentInput {
  name: string;
  type: DocumentType;
  file: File;
  expiresAt?: string;
  notes?: string;
}

export interface UpdateDocumentInput {
  name?: string;
  type?: DocumentType;
  expiresAt?: string;
  notes?: string;
}

export interface DocumentsByCategory {
  [category: string]: Document[];
}

export const documentsApi = {
  // Upload a new document
  upload: async (careRecipientId: string, data: UploadDocumentInput): Promise<Document> => {
    const formData = new FormData();
    formData.append('file', data.file);
    formData.append('name', data.name);
    formData.append('type', data.type);
    if (data.expiresAt) formData.append('expiresAt', data.expiresAt);
    if (data.notes) formData.append('notes', data.notes);

    return api.upload<Document>(`/care-recipients/${careRecipientId}/documents`, formData);
  },

  // List all documents for a care recipient
  list: async (careRecipientId: string): Promise<Document[]> => {
    return api.get<Document[]>(`/care-recipients/${careRecipientId}/documents`);
  },

  // Get a specific document
  get: async (careRecipientId: string, documentId: string): Promise<Document> => {
    return api.get<Document>(`/care-recipients/${careRecipientId}/documents/${documentId}`);
  },

  // Get a signed URL for viewing/downloading a document
  getSignedUrl: async (careRecipientId: string, documentId: string): Promise<{ url: string }> => {
    return api.get<{ url: string }>(`/care-recipients/${careRecipientId}/documents/${documentId}/url`);
  },

  // Get documents grouped by category/type
  getByCategory: async (careRecipientId: string): Promise<DocumentsByCategory> => {
    return api.get<DocumentsByCategory>(`/care-recipients/${careRecipientId}/documents/by-category`);
  },

  // Get documents expiring within a number of days
  getExpiring: async (careRecipientId: string, days: number = 30): Promise<Document[]> => {
    return api.get<Document[]>(`/care-recipients/${careRecipientId}/documents/expiring?days=${days}`);
  },

  // Update a document's metadata
  update: async (
    careRecipientId: string,
    documentId: string,
    data: UpdateDocumentInput
  ): Promise<Document> => {
    return api.patch<Document>(`/care-recipients/${careRecipientId}/documents/${documentId}`, data);
  },

  // Delete a document
  delete: async (careRecipientId: string, documentId: string): Promise<void> => {
    await api.delete(`/care-recipients/${careRecipientId}/documents/${documentId}`);
  },
};


