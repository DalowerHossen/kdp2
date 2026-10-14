// path: lib/http/csrf.ts
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from '@/config/constants';

/**
 * Double-submit CSRF protection. Cookie-session mutations must present the
 * x-csrf-token header matching the kd_csrf cookie. Bearer-token API calls
 * (public v1) are exempt because browsers cannot attach them cross-site.
 */

export function issueCsrfToken(): string {
  return randomBytes(32).toString('base64url');
}

function hasCookieAuth(request: Request): boolean {
  const cookie = request.headers.get('cookie');
  if (cookie === null) return false;
  return /\bsb-[^=]+=/.test(cookie) || /\bkd_session=/.test(cookie);
}

function safeEquals(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a, 'utf8').digest();
  const hb = createHash('sha256').update(b, 'utf8').digest();
  return timingSafeEqual(ha, hb);
}

export function csrfCookieValue(request: Request): string | null {
  const cookie = request.headers.get('cookie');
  if (cookie === null) return null;
  const match = new RegExp(`(?:^|;\\s*)${CSRF_COOKIE_NAME}=([^;]+)`).exec(cookie);
  return match?.[1] ?? null;
}

/** Returns true when the request may proceed. */
export function verifyCsrf(request: Request, method: string): boolean {
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return true;
  if (!hasCookieAuth(request)) return true; // bearer/public API traffic
  const header = request.headers.get(CSRF_HEADER_NAME);
  const cookie = csrfCookieValue(request);
  if (header === null || cookie === null) return false;
  return safeEquals(header, cookie);
}
