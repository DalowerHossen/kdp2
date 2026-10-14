// path: lib/http/network-guard.ts
import type { IpVerdict } from '@/lib/contracts/http';
import type { NetworkGuard } from './providers';

/**
 * Default network guard (X19 seam). The real VPN/proxy/Tor intelligence ships
 * with STEP_12/STEP_15 and registers through registerNetworkGuard; the
 * foundation default blocks nothing it cannot verify, while already enforcing
 * the admin geo allow-list when configured.
 */

export function defaultIpVerdict(ip: string): IpVerdict {
  return { ip, kind: 'unknown', countryCode: null, blocked: false, reason: null };
}

export function extractClientIp(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd !== null && fwd !== '') {
    const first = fwd.split(',')[0]?.trim();
    if (first !== undefined && first !== '') return first;
  }
  const real = request.headers.get('x-real-ip');
  if (real !== null && real.trim() !== '') return real.trim();
  return '0.0.0.0';
}

export function adminGeoGuard(): NetworkGuard {
  return async (ip, path) => {
    const verdict = defaultIpVerdict(ip);
    const allowlist = process.env.ADMIN_GEO_ALLOWLIST;
    if (path.startsWith('/api/admin') && allowlist !== undefined && allowlist.trim() !== '') {
      // Without a geo feed the country is unknown; fail closed for admin only.
      if (verdict.countryCode === null) {
        return { ...verdict, blocked: true, reason: 'geo_unverifiable' };
      }
      const allowed = allowlist.split(',').map((c) => c.trim().toUpperCase());
      if (!allowed.includes(verdict.countryCode.toUpperCase())) {
        return { ...verdict, blocked: true, reason: 'geo_not_allowed' };
      }
    }
    return verdict;
  };
}
