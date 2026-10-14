// path: lib/supabase/server.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requireSupabaseAnonKey, requireSupabaseUrl } from './env';

/**
 * Server Supabase client bound to the request cookie store (anon key,
 * RLS-enforced, per-request). For service-role access use lib/supabase/admin.ts
 * together with withTenantContext().
 */
export function getServerClient(): SupabaseClient {
  const store = cookies();
  return createServerClient(requireSupabaseUrl(), requireSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return store.getAll();
      },
      setAll(toSet) {
        try {
          toSet.forEach(({ name, value, options }) => {
            store.set(name, value, options as CookieOptions);
          });
        } catch {
          // Called from a Server Component without a mutable cookie store:
          // the middleware refresh path (lib/supabase/middleware.ts) owns
          // cookie writes there.
        }
      },
    },
  });
}
