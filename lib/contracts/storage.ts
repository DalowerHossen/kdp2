// path: lib/contracts/storage.ts
/**
 * Storage contract (CONTRACTS.md section 7). Precedence is fixed by decision C5:
 * google-drive then supabase-storage, resolved per tenant at runtime, recorded
 * as `provider` on every row, automatic fallback when isAvailable() is false,
 * plus a provider-migration tool. Every file is AES-256-GCM encrypted before
 * upload; the key is derived from tenant ID + master key, never stored plainly.
 * Implemented by STEP_13 against this interface.
 */
import type { RequestContext } from './http';

export type StorageProvider = 'google-drive' | 'supabase-storage';

export type FileCategory =
  | 'invoice'
  | 'receipt'
  | 'kyc'
  | 'logo'
  | 'branding'
  | 'attachment'
  | 'contract'
  | 'evidence'
  | 'payslip'
  | 'report'
  | 'media'
  | 'expense'
  | 'employee'
  | 'other';

export interface StoredFile {
  readonly id: string;
  readonly companyId: string;
  readonly provider: StorageProvider;
  readonly externalId: string;
  readonly category: FileCategory;
  readonly name: string;
  readonly mimeType: string;
  readonly bytes: number;
  readonly contentHash: string; // sha256 of plaintext
  readonly encryption: 'aes-256-gcm';
  readonly createdAt: string;
}

export interface UploadInput {
  readonly companyId: string;
  readonly category: FileCategory;
  readonly name: string;
  readonly mimeType: string;
  readonly data: Uint8Array;
  readonly correlationId: string;
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
