// path: config/permissions/map.ts
import { FOUNDATION_PERMISSIONS, type PermissionDefinition } from './00-foundation';

/**
 * Permission aggregator. Modules are plain files exporting `permissions`;
 * steps add config/permissions/<slug>.ts through the integrator merge.
 */

interface PermissionModuleShape {
  readonly permissions: readonly PermissionDefinition[];
}

interface WebpackContext {
  (id: string): unknown;
  keys(): string[];
}

declare const require:
  | { context: (dir: string, useSubdirectories: boolean, regExp: RegExp) => WebpackContext }
  | undefined;

function loadStepPermissions(): readonly PermissionDefinition[] {
  if (typeof require === 'undefined' || typeof require.context !== 'function') {
    return [];
  }
  const ctx = require.context('.', false, /^\.\/(?!00-foundation|map)[^/]+\.ts$/);
  const out: PermissionDefinition[] = [];
  for (const key of ctx.keys().sort()) {
    const mod = ctx(key) as Partial<PermissionModuleShape>;
    if (mod.permissions !== undefined && Array.isArray(mod.permissions)) {
      out.push(...mod.permissions);
    }
  }
  return out;
}

let cached: ReadonlyMap<string, PermissionDefinition> | null = null;

export function allPermissions(): ReadonlyMap<string, PermissionDefinition> {
  if (cached !== null) return cached;
  const map = new Map<string, PermissionDefinition>();
  for (const def of [...FOUNDATION_PERMISSIONS, ...loadStepPermissions()]) {
    if (map.has(def.key)) {
      throw new Error(`Duplicate permission key registered: ${def.key}`);
    }
    map.set(def.key, def);
  }
  cached = map;
  return map;
}

export function isKnownPermission(key: string): boolean {
  return key === '*' || allPermissions().has(key);
}
