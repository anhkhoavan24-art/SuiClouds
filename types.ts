export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export enum FileType {
  IMAGE = 'image',
  VIDEO = 'video',
  DOCUMENT = 'document',
  OTHER = 'other',
}

export interface StoredFile {
  id: string;
  blobId: string; // Walrus Blob ID
  name: string;
  size: number;
  type: FileType;
  uploadDate: Date;
  url?: string; // For display purposes
}

export interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
}