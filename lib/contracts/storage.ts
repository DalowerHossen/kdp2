// path: lib/contracts/storage.ts
import type { RequestContext } from '@/lib/contracts/http';

export type StorageProvider = 'google-drive' | 'supabase-storage';

export type FileCategory =
  | 'invoice'
  | 'receipt'
  | 'contract'
  | 'report'
  | 'kyc'
  | 'logo'
  | 'attachment'
  | 'payroll'
  | 'signature'
  | 'dispute'
  | 'other';

export interface UploadInput {
  readonly companyId: string;
  readonly category: FileCategory;
  readonly name: string;
  readonly mimeType: string;
  readonly content: Uint8Array;
  readonly contentHash: string;
}

export interface StoredFile {
  readonly id: string;
  readonly companyId: string;
  readonly provider: StorageProvider;
  readonly externalId: string;
  readonly category: FileCategory;
  readonly name: string;
  readonly mimeType: string;
  readonly bytes: number;
  readonly contentHash: string;
  readonly encryption: 'aes-256-gcm';
  readonly createdAt: string;
}

export interface StorageAdapter {
  readonly name: StorageProvider;
  isAvailable(): Promise<boolean>;
  upload(input: UploadInput): Promise<StoredFile>;
  download(fileId: string, ctx: RequestContext): Promise<Uint8Array>;
  signedUrl(fileId: string, ttlSeconds: number, ctx: RequestContext): Promise<string>;
  remove(fileId: string, ctx: RequestContext): Promise<void>;
  restore(fileId: string, ctx: RequestContext): Promise<void>;
}
