// path: lib/http/csp.ts
import { ValidationError } from '@/lib/errors/domain-errors';

const NONCE_PATTERN = /^[a-f0-9]{32}$/;
const DEFAULT_CONNECT_ORIGINS = ['https://api.supabase.co'];

function randomHex(length: number): string {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function normalizeConnectOrigin(value: string): string {
  try {
    const url = new URL(value);
    const localDevelopmentOrigin =
      process.env.NODE_ENV === 'development' &&
      url.protocol === 'http:' &&
      (url.hostname === 'localhost' || url.hostname === '127.0.0.1');
    if (
      (url.protocol !== 'https:' && !localDevelopmentOrigin) ||
      url.username.length > 0 ||
      url.password.length > 0 ||
      url.pathname !== '/' ||
      url.search.length > 0 ||
      url.hash.length > 0
    ) {
      throw new ValidationError('A CSP connection origin is invalid.');
    }
    return url.origin;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError('A CSP connection origin is invalid.');
  }
}

export function createCspNonce(): string {
  return randomHex(16);
}

export function buildContentSecurityPolicy(
  nonce: string,
  additionalConnectOrigins: readonly string[] = [],
): string {
  if (!NONCE_PATTERN.test(nonce)) {
    throw new ValidationError('The CSP nonce is invalid.');
  }
  const connectOrigins = new Set(DEFAULT_CONNECT_ORIGINS);
  const configuredSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (configuredSupabaseUrl !== undefined && configuredSupabaseUrl.length > 0) {
    connectOrigins.add(normalizeConnectOrigin(configuredSupabaseUrl));
  }
  for (const origin of additionalConnectOrigins) {
    connectOrigins.add(normalizeConnectOrigin(origin));
  }
  const connectSources = ["'self'", ...Array.from(connectOrigins).sort()].join(' ');
  const nonceSource = `'nonce-${nonce}'`;
  return [
    "default-src 'self'",
    `script-src 'self' ${nonceSource}`,
    `style-src 'self' ${nonceSource}`,
    "img-src 'self' https: data:",
    `connect-src ${connectSources}`,
    "font-src 'self' data:",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    'upgrade-insecure-requests',
    'block-all-mixed-content',
  ].join('; ');
}
