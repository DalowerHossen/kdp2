// path: lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { AppError } from '@/lib/contracts/errors';
import { InternalError } from '@/lib/errors/domain-errors';
import type { Database } from '@/lib/db/types';
import { getSupabasePublicConfig } from '@/lib/supabase/client';

export async function createClient(): Promise<SupabaseClient<Database>> {
  try {
    const cookieStore = await cookies();
    const config = getSupabasePublicConfig();
    return createServerClient<Database>(config.url, config.anonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components have a read-only cookie store; middleware persists refreshes.
          }
        },
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new InternalError();
  }
}
