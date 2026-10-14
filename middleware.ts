// path: middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { CSRF_COOKIE_NAME, createCsrfToken } from '@/lib/http/csrf';
import { buildContentSecurityPolicy, createCspNonce } from '@/lib/http/csp';
import { CORRELATION_HEADER, resolveRequestCorrelationId } from '@/lib/http/correlation';
import { refreshSupabaseSession } from '@/lib/supabase/middleware';

const CSRF_TOKEN_PATTERN = /^[A-Fa-f0-9]{64}$/u;
const CSRF_COOKIE_MAX_AGE_SECONDS = 28_800;
const CSP_HEADER = 'content-security-policy';
const NONCE_HEADER = 'x-nonce';

function hasConsistentRequestAuthority(request: NextRequest): boolean {
  const hostHeader = request.headers.get('host');
  if (hostHeader === null || hostHeader.length === 0 || hostHeader.length > 255) {
    return false;
  }
  try {
    const authorityUrl = new URL(`${request.nextUrl.protocol}//${hostHeader}`);
    return (
      authorityUrl.host.toLowerCase() === request.nextUrl.host.toLowerCase() &&
      authorityUrl.username.length === 0 &&
      authorityUrl.password.length === 0 &&
      authorityUrl.pathname === '/' &&
      authorityUrl.search.length === 0 &&
      authorityUrl.hash.length === 0
    );
  } catch {
    return false;
  }
}

function shouldRefreshSupabaseSession(): boolean {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';
  if (supabaseUrl.length === 0 && anonKey.length === 0 && process.env.NODE_ENV === 'development') {
    return false;
  }
  if (supabaseUrl.length === 0 || anonKey.length === 0) {
    throw new Error('Supabase session middleware is not configured.');
  }
  return true;
}

function addSecurityHeaders(
  response: NextResponse,
  correlationId: string,
  contentSecurityPolicy: string,
  isSecureRequest: boolean,
): NextResponse {
  response.headers.set(CORRELATION_HEADER, correlationId);
  response.headers.set(CSP_HEADER, contentSecurityPolicy);
  response.headers.set('x-content-type-options', 'nosniff');
  response.headers.set('x-frame-options', 'DENY');
  response.headers.set('referrer-policy', 'strict-origin-when-cross-origin');
  response.headers.set('permissions-policy', 'camera=(), geolocation=(), microphone=()');
  if (isSecureRequest && process.env.NODE_ENV === 'production') {
    response.headers.set('strict-transport-security', 'max-age=31536000');
  }
  return response;
}

function setCsrfCookie(response: NextResponse, request: NextRequest): void {
  const existingToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  if (existingToken !== undefined && CSRF_TOKEN_PATTERN.test(existingToken)) {
    return;
  }
  response.cookies.set(CSRF_COOKIE_NAME, createCsrfToken(), {
    httpOnly: false,
    maxAge: CSRF_COOKIE_MAX_AGE_SECONDS,
    path: '/',
    sameSite: 'strict',
    secure: true,
  });
}

function createForwardedRequestHeaders(
  request: NextRequest,
  correlationId: string,
  nonce: string,
  contentSecurityPolicy: string,
): Headers {
  const headers = new Headers(request.headers);
  headers.set(CORRELATION_HEADER, correlationId);
  headers.set(NONCE_HEADER, nonce);
  headers.set(CSP_HEADER, contentSecurityPolicy);
  return headers;
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const correlationId = resolveRequestCorrelationId(request.headers.get(CORRELATION_HEADER));
  const nonce = createCspNonce();
  const isSecureRequest = request.nextUrl.protocol === 'https:';
  let contentSecurityPolicy: string;
  try {
    contentSecurityPolicy = buildContentSecurityPolicy(nonce);
  } catch {
    const response = new NextResponse(null, { status: 503 });
    return addSecurityHeaders(
      response,
      correlationId,
      "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
      isSecureRequest,
    );
  }

  if (!hasConsistentRequestAuthority(request)) {
    const response = new NextResponse(null, { status: 400 });
    return addSecurityHeaders(response, correlationId, contentSecurityPolicy, isSecureRequest);
  }

  let sessionResponse: NextResponse | null = null;
  try {
    if (shouldRefreshSupabaseSession()) {
      sessionResponse = (await refreshSupabaseSession(request)).response;
    }
  } catch {
    const response = new NextResponse(null, { status: 503 });
    return addSecurityHeaders(response, correlationId, contentSecurityPolicy, isSecureRequest);
  }

  const requestHeaders = createForwardedRequestHeaders(
    request,
    correlationId,
    nonce,
    contentSecurityPolicy,
  );
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  if (sessionResponse !== null) {
    for (const cookie of sessionResponse.cookies.getAll()) {
      response.cookies.set(cookie);
    }
  }
  setCsrfCookie(response, request);
  return addSecurityHeaders(response, correlationId, contentSecurityPolicy, isSecureRequest);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
};
