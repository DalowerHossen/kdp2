// path: lib/contracts/nav.ts
/**
 * Navigation module contract (CONTRACTS.md section 13). A step adds a module in
 * config/nav/<slug>.nav.ts; it never edits the aggregator config/nav-map.ts.
 */
import type { RoleName } from './auth';

export interface NavItem {
  readonly href: string;
  readonly label: string;
  readonly icon: string; // lucide icon key
  readonly permission: string;
  readonly roles: readonly RoleName[];
  readonly children?: readonly NavItem[];
}

export interface NavModule {
  readonly id: string;
  readonly section: 'dashboard' | 'admin' | 'portal' | 'public';
  readonly items: readonly NavItem[];
}

export const NAV_MODULE_MARKER = '@kd/nav-module' as const;
