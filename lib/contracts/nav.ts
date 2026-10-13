// path: lib/contracts/nav.ts
import type { RoleName } from '@/lib/contracts/auth';

export type NavSection = 'public' | 'dashboard' | 'admin' | 'client-portal';

export interface NavItem {
  readonly href: string;
  readonly label: string;
  readonly icon?: string;
  readonly permission?: string;
  readonly roles?: readonly RoleName[];
  readonly children?: readonly NavItem[];
}

export interface NavModule {
  readonly id: string;
  readonly section: NavSection;
  readonly items: readonly NavItem[];
  readonly routes?: readonly string[];
}
