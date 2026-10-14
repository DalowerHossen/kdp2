// path: lib/supabase/client.ts
'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requireSupabaseAnonKey, requireSupabaseUrl } from './env';

/**
 * Browser Supabase client (anon key, RLS-enforced). Created lazily so the app
 * builds and renders shells even when Supabase env vars are not yet set.
 */

let cached: SupabaseClient | null = null;

export function getBrowserClient(): SupabaseClient {
  if (cached !== null) return cached;
  cached = createBrowserClient(requireSupabaseUrl(), requireSupabaseAnonKey());
  return cached;
}
