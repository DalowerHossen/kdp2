// path: lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { InternalError } from '@/lib/errors/domain-errors';
import type { Database } from '@/lib/db/types';

export interface SupabasePublicConfig {
  readonly url: string;
  readonly anonKey: string;
}

let browserClient: SupabaseClient<Database> | null = null;

function hasControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 31 || code === 127) {
      return true;
    }
  }
  return false;
}

function normalizeProjectUrl(value: string): string {
  try {
    const url = new URL(value);
    const localDevelopmentUrl =
      process.env.NODE_ENV === 'development' &&
      url.protocol === 'http:' &&
      (url.hostname === 'localhost' || url.hostname === '127.0.0.1');
    if (
      (url.protocol !== 'https:' && !localDevelopmentUrl) ||
      url.username.length > 0 ||
      url.password.length > 0 ||
      url.pathname !== '/' ||
      url.search.length > 0 ||
      url.hash.length > 0
    ) {
      throw new InternalError();
    }
    return url.toString().replace(/\/$/u, '');
  } catch {
    throw new InternalError();
  }
}

export function getSupabasePublicConfig(): SupabasePublicConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (
    url === undefined ||
    anonKey === undefined ||
    anonKey.trim().length === 0 ||
    anonKey !== anonKey.trim() ||
    anonKey.length > 4096 ||
    hasControlCharacter(anonKey)
  ) {
    throw new InternalError();
  }
  return Object.freeze({ url: normalizeProjectUrl(url), anonKey });
}

export function createClient(): SupabaseClient<Database> {
  if (browserClient !== null) {
    return browserClient;
  }
  const config = getSupabasePublicConfig();
  browserClient = createBrowserClient<Database>(config.url, config.anonKey);
  return browserClient;
}
