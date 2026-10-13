// path: lib/supabase/admin.ts
import 'server-only';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { InternalError } from '@/lib/errors/domain-errors';
import type { Database } from '@/lib/db/types';

interface AdminConfig {
  readonly url: string;
  readonly serviceRoleKey: string;
}

let adminClient: SupabaseClient<Database> | null = null;

function hasControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 31 || code === 127) {
      return true;
    }
  }
  return false;
}

function readAdminConfig(): AdminConfig {
  const urlValue = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (
    urlValue === undefined ||
    serviceRoleKey === undefined ||
    serviceRoleKey.trim().length === 0 ||
    serviceRoleKey !== serviceRoleKey.trim() ||
    serviceRoleKey.length > 8192 ||
    hasControlCharacter(serviceRoleKey)
  ) {
    throw new InternalError();
  }
  try {
    const url = new URL(urlValue);
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
    return Object.freeze({ url: url.toString().replace(/\/$/u, ''), serviceRoleKey });
  } catch {
    throw new InternalError();
  }
}

export function createAdminClient(): SupabaseClient<Database> {
  if (adminClient !== null) {
    return adminClient;
  }
  const config = readAdminConfig();
  adminClient = createSupabaseClient<Database>(config.url, config.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
  return adminClient;
}
