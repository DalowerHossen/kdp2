// path: config/nav-map.ts
import type { NavModule, NavItem } from '@/lib/contracts/nav';
import { NAV_MODULE_MARKER } from '@/lib/contracts/nav';

/**
 * Navigation aggregator (CONTRACTS.md section 13, X20). Every nav module in
 * config/nav/<slug>.nav.ts registers itself through require.context glob
 * import; this file is the single source for sidebars, breadcrumbs, the
 * command palette and the dead-link audit. Steps never edit this file.
 */

interface WebpackContext {
  (id: string): unknown;
  keys(): string[];
}

declare const require:
  | { context: (dir: string, useSubdirectories: boolean, regExp: RegExp) => WebpackContext }
  | undefined;

function loadModules(): NavModule[] {
  if (typeof require === 'undefined' || typeof require.context !== 'function') {
    return [];
  }
  const ctx = require.context('./nav', false, /\.nav\.ts$/);
  const modules: NavModule[] = [];
  for (const key of ctx.keys().sort()) {
    const mod = ctx(key) as { default?: unknown; nav?: unknown; [NAV_MODULE_MARKER]?: unknown };
    const candidate = mod.default ?? mod.nav ?? mod[NAV_MODULE_MARKER];
    if (isNavModule(candidate)) {
      modules.push(candidate);
    }
  }
  return modules;
}

function isNavModule(value: unknown): value is NavModule {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as { id?: unknown; section?: unknown; items?: unknown };
  return (
    typeof v.id === 'string' &&
    typeof v.section === 'string' &&
    Array.isArray(v.items) &&
    (v.items as unknown[]).every(isNavItemLike)
  );
}

function isNavItemLike(value: unknown): value is NavItem {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as { href?: unknown; label?: unknown; permission?: unknown };
  return typeof v.href === 'string' && typeof v.label === 'string' && typeof v.permission === 'string';
}

let cached: readonly NavModule[] | null = null;

export function getNavModules(): readonly NavModule[] {
  cached ??= Object.freeze(loadModules());
  return cached;
}

/** Sidebar tree for one shell, filtered by actor permissions and role. */
export function sidebarFor(
  section: NavModule['section'],
  actor: { permissions: ReadonlySet<string>; role: string } | null,
): readonly NavModule[] {
  const modules = getNavModules().filter((m) => m.section === section);
  if (actor === null) return [];
  return modules
    .map((m) => ({
      ...m,
      items: m.items.filter(
        (item) =>
          (actor.permissions.has(item.permission) || actor.permissions.has('*')) &&
          (item.roles.length === 0 || item.roles.includes(actor.role as NavItem['roles'][number])),
      ),
    }))
    .filter((m) => m.items.length > 0);
}

export interface Breadcrumb {
  readonly href: string;
  readonly label: string;
}

/** Breadcrumb trail derived from the registered nav tree. */
export function breadcrumbsFor(pathname: string): readonly Breadcrumb[] {
  const crumbs: Breadcrumb[] = [];
  for (const mod of getNavModules()) {
    for (const item of mod.items) {
      if (item.href === pathname) {
        const parent = sectionRoot(mod.section);
        if (parent !== item.href) crumbs.push({ href: parent, label: sectionLabel(mod.section) });
        crumbs.push({ href: item.href, label: item.label });
        return crumbs;
      }
    }
  }
  return crumbs;
}

function sectionRoot(section: NavModule['section']): string {
  switch (section) {
    case 'dashboard':
      return '/dashboard';
    case 'admin':
      return '/admin';
    case 'portal':
      return '/hub';
    case 'public':
      return '/';
  }
}

function sectionLabel(section: NavModule['section']): string {
  switch (section) {
    case 'dashboard':
      return 'Dashboard';
    case 'admin':
      return 'Administration';
    case 'portal':
      return 'Client portal';
    case 'public':
      return 'Home';
  }
}

/** Every href from every module - used by the dead-link audit (X20). */
export function registeredRoutes(): readonly string[] {
  return getNavModules().flatMap((m) => flattenHrefs(m.items));
}

function flattenHrefs(items: readonly NavItem[]): string[] {
  const out: string[] = [];
  for (const item of items) {
    out.push(item.href);
    if (item.children !== undefined) out.push(...flattenHrefs(item.children));
  }
  return out;
}
