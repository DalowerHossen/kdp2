// path: lib/http/csrf.ts
import { ForbiddenError } from '@/lib/errors/domain-errors';

export const CSRF_COOKIE_NAME = '__Host-csrf';
export const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_TOKEN_PATTERN = /^[A-Fa-f0-9]{64}$/;
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const CSRF_COOKIE_MAX_AGE_SECONDS = 28_800;

export function createCsrfToken(): string {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function formatCsrfCookie(token: string): string {
  if (!CSRF_TOKEN_PATTERN.test(token)) {
    throw new ForbiddenError('A valid CSRF token is required.');
  }
  return `${CSRF_COOKIE_NAME}=${token}; Path=/; Max-Age=${CSRF_COOKIE_MAX_AGE_SECONDS}; Secure; SameSite=Strict`;
}

function readCookie(cookieHeader: string | null): string | null {
  if (cookieHeader === null) {
    return null;
  }
  const matches = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part.startsWith(`${CSRF_COOKIE_NAME}=`));
  if (matches.length !== 1) {
    return null;
  }
  return matches[0]?.slice(CSRF_COOKIE_NAME.length + 1) ?? null;
}

function constantTimeEqual(left: string, right: string): boolean {
  let difference = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const leftCode = index < left.length ? left.charCodeAt(index) : 0;
    const rightCode = index < right.length ? right.charCodeAt(index) : 0;
    difference |= leftCode ^ rightCode;
  }
  return difference === 0;
}

function hasSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin') ?? request.headers.get('referer');
  if (origin === null) {
    return false;
  }
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export function verifyCsrfRequest(request: Request): boolean {
  if (SAFE_METHODS.has(request.method.toUpperCase())) {
    return true;
  }
  const cookieToken = readCookie(request.headers.get('cookie'));
  const headerToken = request.headers.get(CSRF_HEADER_NAME);
  if (
    cookieToken === null ||
    headerToken === null ||
    !CSRF_TOKEN_PATTERN.test(cookieToken) ||
    !CSRF_TOKEN_PATTERN.test(headerToken)
  ) {
    return false;
  }
  return hasSameOrigin(request) && constantTimeEqual(cookieToken, headerToken);
}

export function assertCsrfRequest(request: Request, correlationId?: string): void {
  if (!verifyCsrfRequest(request)) {
    throw new ForbiddenError('The request could not be verified.', {
      ...(correlationId === undefined ? {} : { correlationId }),
    });
  }
}
