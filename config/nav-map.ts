// path: config/nav-map.ts
import type { RoleName } from '@/lib/contracts/auth';
import type { NavItem, NavModule, NavSection } from '@/lib/contracts/nav';

const NAV_SECTIONS: readonly NavSection[] = ['public', 'dashboard', 'admin', 'client-portal'];
const ROLE_NAMES: readonly RoleName[] = ['super_admin', 'ceo', 'admin_staff', 'owner', 'staff'];

interface NavigationModuleContext {
  (modulePath: string): Readonly<Record<string, unknown>>;
  keys(): string[];
}

interface NavigationContextFactory {
  context(
    directory: string,
    includeSubdirectories: boolean,
    filenamePattern: RegExp,
  ): NavigationModuleContext;
}

interface NavigationEntry {
  readonly item: NavItem;
  readonly ancestors: readonly NavItem[];
}

export interface NavAccessContext {
  readonly roles: ReadonlySet<RoleName>;
  readonly permissions: ReadonlySet<string>;
}

export interface NavigationAudit {
  readonly deadLinks: readonly string[];
  readonly unregisteredRoutes: readonly string[];
}

const navigationContext = (require as unknown as NavigationContextFactory).context(
  '.',
  true,
  /^\.\/nav\/.*\.nav\.ts$/u,
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRoleName(value: unknown): value is RoleName {
  return typeof value === 'string' && ROLE_NAMES.includes(value as RoleName);
}

function isNavSection(value: unknown): value is NavSection {
  return typeof value === 'string' && NAV_SECTIONS.includes(value as NavSection);
}

function hasControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 32 || code === 127) {
      return true;
    }
  }
  return false;
}

function normalizePathname(pathname: string): string {
  const pathPart = pathname.split(/[?#]/u)[0] ?? '/';
  const segments = pathPart.split('/').filter((segment) => segment.length > 0);
  return segments.length === 0 ? '/' : `/${segments.join('/')}`;
}

function isInternalRoute(route: unknown): route is string {
  if (
    typeof route !== 'string' ||
    !route.startsWith('/') ||
    route.startsWith('//') ||
    route.includes('\\') ||
    hasControlCharacter(route)
  ) {
    return false;
  }
  const pathPart = route.split(/[?#]/u)[0] ?? '/';
  if (pathPart.split('/').some((segment) => segment === '.' || segment === '..')) {
    return false;
  }
  try {
    return new URL(route, 'https://nav.invalid').origin === 'https://nav.invalid';
  } catch {
    return false;
  }
}

function isNavItem(value: unknown, depth = 0): value is NavItem {
  if (
    depth > 8 ||
    !isRecord(value) ||
    !isInternalRoute(value.href) ||
    typeof value.label !== 'string' ||
    value.label.trim().length === 0
  ) {
    return false;
  }
  const iconIsValid = value.icon === undefined || typeof value.icon === 'string';
  const permissionIsValid =
    value.permission === undefined ||
    (typeof value.permission === 'string' && value.permission.trim().length > 0);
  const rolesAreValid =
    value.roles === undefined || (Array.isArray(value.roles) && value.roles.every(isRoleName));
  const childrenAreValid =
    value.children === undefined ||
    (Array.isArray(value.children) && value.children.every((child) => isNavItem(child, depth + 1)));
  return iconIsValid && permissionIsValid && rolesAreValid && childrenAreValid;
}

function isNavModule(value: unknown): value is NavModule {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    !/^[a-z][a-z0-9-]*$/u.test(value.id) ||
    !isNavSection(value.section) ||
    !Array.isArray(value.items) ||
    !value.items.every((item) => isNavItem(item))
  ) {
    return false;
  }
  return (
    value.routes === undefined ||
    (Array.isArray(value.routes) && value.routes.every((route) => isInternalRoute(route)))
  );
}

function loadNavigationModule(modulePath: string): NavModule {
  const exportedValues = Object.values(navigationContext(modulePath));
  const candidates = exportedValues.filter(isNavModule);
  const module = candidates[0];
  if (candidates.length !== 1 || module === undefined) {
    throw new Error(`Navigation module ${modulePath} must export exactly one valid NavModule.`);
  }
  return module;
}

function assertUniqueModuleIds(modules: readonly NavModule[]): void {
  const moduleIds = new Set<string>();
  for (const module of modules) {
    if (moduleIds.has(module.id)) {
      throw new Error(`Navigation module ID ${module.id} is registered more than once.`);
    }
    moduleIds.add(module.id);
  }
}

function collectNavigationEntries(
  items: readonly NavItem[],
  ancestors: readonly NavItem[] = [],
): NavigationEntry[] {
  const entries: NavigationEntry[] = [];
  for (const item of items) {
    entries.push({ item, ancestors });
    if (item.children !== undefined) {
      entries.push(...collectNavigationEntries(item.children, [...ancestors, item]));
    }
  }
  return entries;
}

function flattenItems(items: readonly NavItem[]): NavItem[] {
  const flattened: NavItem[] = [];
  for (const item of items) {
    flattened.push(item);
    if (item.children !== undefined) {
      flattened.push(...flattenItems(item.children));
    }
  }
  return flattened;
}

function hasAccess(item: NavItem, access: NavAccessContext): boolean {
  const roleAllowed = item.roles === undefined || item.roles.some((role) => access.roles.has(role));
  const permissionAllowed =
    item.permission === undefined || access.permissions.has(item.permission);
  return roleAllowed && permissionAllowed;
}

function filterVisibleItems(items: readonly NavItem[], access: NavAccessContext): NavItem[] {
  const visibleItems: NavItem[] = [];
  for (const item of items) {
    if (!hasAccess(item, access)) {
      continue;
    }
    const children =
      item.children === undefined ? undefined : filterVisibleItems(item.children, access);
    visibleItems.push(children === undefined ? item : { ...item, children });
  }
  return visibleItems;
}

function routeSegments(route: string): readonly string[] {
  const normalized = normalizePathname(route);
  return normalized === '/' ? [] : normalized.slice(1).split('/');
}

function routeMatches(pattern: string, pathname: string): boolean {
  const patternSegments = routeSegments(pattern);
  const pathSegments = routeSegments(pathname);
  if (patternSegments.length > pathSegments.length) {
    return false;
  }
  return patternSegments.every((segment, index) => {
    const pathSegment = pathSegments[index];
    return pathSegment !== undefined && (/^\[[^/]+\]$/u.test(segment) || segment === pathSegment);
  });
}

function routesAreEquivalent(left: string, right: string): boolean {
  const leftSegments = routeSegments(left);
  const rightSegments = routeSegments(right);
  return (
    leftSegments.length === rightSegments.length &&
    leftSegments.every((segment, index) => {
      const other = rightSegments[index];
      return (
        other !== undefined &&
        (segment === other || /^\[[^/]+\]$/u.test(segment) || /^\[[^/]+\]$/u.test(other))
      );
    })
  );
}

export const navigationModules: readonly NavModule[] = Object.freeze(
  navigationContext.keys().sort().map(loadNavigationModule),
);
assertUniqueModuleIds(navigationModules);

const navigationEntries = navigationModules.flatMap((module) =>
  collectNavigationEntries(module.items),
);

export function getRegisteredRoutes(): readonly string[] {
  const routes = new Set<string>();
  for (const module of navigationModules) {
    for (const route of module.routes ?? []) {
      routes.add(normalizePathname(route));
    }
    for (const item of flattenItems(module.items)) {
      routes.add(normalizePathname(item.href));
    }
  }
  return Object.freeze(Array.from(routes).sort());
}

export function getSidebarItems(section: NavSection, access: NavAccessContext): readonly NavItem[] {
  const items = navigationModules
    .filter((module) => module.section === section)
    .flatMap((module) => filterVisibleItems(module.items, access));
  return Object.freeze(items);
}

export function getCommandPaletteItems(access: NavAccessContext): readonly NavItem[] {
  const items = navigationModules.flatMap((module) =>
    flattenItems(filterVisibleItems(module.items, access)),
  );
  return Object.freeze(items);
}

export function getBreadcrumbs(pathname: string): readonly NavItem[] {
  const normalizedPath = normalizePathname(pathname);
  const matches = navigationEntries
    .filter((entry) => routeMatches(entry.item.href, normalizedPath))
    .sort(
      (left, right) => routeSegments(right.item.href).length - routeSegments(left.item.href).length,
    );
  const match = matches[0];
  if (match === undefined) {
    return Object.freeze([]);
  }
  return Object.freeze([...match.ancestors, match.item]);
}

export function auditNavigation(pageRoutes: readonly string[]): NavigationAudit {
  const normalizedPages = pageRoutes.map(normalizePathname);
  const registeredRoutes = getRegisteredRoutes();
  const unregisteredRoutes = normalizedPages.filter(
    (pageRoute) => !registeredRoutes.some((route) => routesAreEquivalent(route, pageRoute)),
  );
  const deadLinks = registeredRoutes.filter(
    (route) => !normalizedPages.some((pageRoute) => routesAreEquivalent(route, pageRoute)),
  );
  return Object.freeze({
    deadLinks: Object.freeze(deadLinks),
    unregisteredRoutes: Object.freeze(unregisteredRoutes),
  });
}
