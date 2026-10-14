// path: middleware.ts
import { NextResponse, type NextRequest } from 'next/server';
import { CORRELATION_HEADER } from '@/config/constants';
import { resolveCorrelationId, mintCorrelationId } from '@/lib/logger/correlation';
import { buildCspHeader, SECURITY_HEADERS } from '@/lib/http/csp';
import { updateSession } from '@/lib/supabase/middleware';

/**
 * Edge middleware (STEP_00): every request gets a correlation ID, a per-request
 * CSP nonce and security headers. Cookie sessions are refreshed through the
 * Supabase SSR helper when configured. STEP_12/STEP_15 deepen this with the
 * full network guard, geo fencing and device posture checks; the seams are
 * already in place here.
 */

const SKIP_PREFIXES = ['/_next/', '/favicon', '/icon', '/opengraph', '/sitemap', '/robots'];

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  if (SKIP_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const correlationId = resolveCorrelationId(request.headers.get(CORRELATION_HEADER));
  const nonce = mintCorrelationId().replaceAll('-', '');

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(CORRELATION_HEADER, correlationId);
  requestHeaders.set('x-csp-nonce', nonce);

  let response = NextResponse.next({ request: { headers: requestHeaders } });

  // Supabase cookie refresh (no-op when env is not configured).
  try {
    const session = await updateSession(request, response);
    response = session.response;
  } catch {
    // Session refresh must never take the site down; the route layer re-checks
    // auth on every protected surface anyway.
  }

  const isDev = process.env.NODE_ENV === 'development';
  response.headers.set('content-security-policy', buildCspHeader({ nonce, isDev }));
  response.headers.set(CORRELATION_HEADER, correlationId);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(k, v);
  }
  return response;
}

export const config = {
  matcher: [
    /*
     * Match everything except Next internals and files with an extension.
     */
    '/((?!_next/static|_next/image|.*\\..*).*)',
  ],
};
