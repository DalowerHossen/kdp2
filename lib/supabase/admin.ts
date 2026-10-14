// path: lib/supabase/admin.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { requireServiceRoleKey, requireSupabaseUrl } from './env';

/**
 * Service-role client: BYPASSES Row Level Security. Use only on the server,
 * and always scope reads/writes with withTenantContext() (rls-helpers) or an
 * explicit company_id filter. Never expose this client to route handlers that
 * return user-controlled queries.
 */

let cached: SupabaseClient | null = null;

export function getAdminClient(): SupabaseClient {
  if (cached !== null) return cached;
  cached = createClient(requireSupabaseUrl(), requireServiceRoleKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { 'x-application': 'kd-service-role' },
    },
  });
  return cached;
}
