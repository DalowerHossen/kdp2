// path: lib/http/csp.ts
/**
 * Content Security Policy builder (X15). Each response carries a per-request
 * nonce; steps extend connect-src via their integrator request files, merged
 * into config/constants-adjacent CSP config at integration time.
 */

export interface CspOptions {
  readonly nonce: string;
  readonly isDev: boolean;
  readonly extraConnectSrc?: readonly string[];
  readonly reportUri?: string | null;
}

export function buildCspHeader(options: CspOptions): string {
  const { nonce, isDev, extraConnectSrc = [], reportUri = null } = options;
  const scriptSrc = [
    `'self'`,
    `'nonce-${nonce}'`,
    `'strict-dynamic'`,
    ...(isDev ? [`'unsafe-eval'`] : []),
  ].join(' ');
  const styleSrc = [`'self'`, `'unsafe-inline'`].join(' '); // Tailwind injects inline styles in dev; nonce-scoped styles arrive with STEP_01.
  const connectSrc = [`'self'`, ...extraConnectSrc].join(' ');

  const directives = [
    `default-src 'self'`,
    `base-uri 'self'`,
    `object-src 'none'`,
    `frame-ancestors 'none'`,
    `form-action 'self'`,
    `img-src 'self' data: blob:`,
    `font-src 'self' data:`,
    `script-src ${scriptSrc}`,
    `style-src ${styleSrc}`,
    `connect-src ${connectSrc}`,
    `worker-src 'self'`,
    `manifest-src 'self'`,
    `upgrade-insecure-requests`,
  ];
  if (reportUri !== null) {
    directives.push(`report-uri ${reportUri}`);
  }
  return directives.join('; ');
}

export const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=()',
} as const;
