import { apiFetch } from './api';
import { DocumentType } from './document-types';

export interface ProgressInfo {
  required_filled: number;
  required_total: number;
}

export interface DocumentListItem {
  id: number;
  document_type: DocumentType;
  display_name: string;
  progress: ProgressInfo;
  updated_at: string;
}

export interface DocumentResponse {
  id: number;
  document_type: DocumentType;
  fields: Record<string, string>;
  progress: ProgressInfo;
  created_at: string;
  updated_at: string;
}

export const listDocuments = () =>
  apiFetch<DocumentListItem[]>('/api/documents');

export const getDocumentByType = (t: DocumentType) =>
  apiFetch<DocumentResponse>(`/api/documents/by-type/${t}`);

export const getDocumentById = (id: number) =>
  apiFetch<DocumentResponse>(`/api/documents/${id}`);