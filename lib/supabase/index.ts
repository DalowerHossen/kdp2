// path: lib/supabase/index.ts
export { getBrowserClient } from './client';
export { getServerClient } from './server';
export { getAdminClient } from './admin';
export { updateSession } from './middleware';
export { withTenantContext, withPlatformContext } from './rls-helpers';
export {
  isSupabaseConfigured,
  supabaseUrl,
  supabaseAnonKey,
  supabaseServiceRoleKey,
  requireSupabaseUrl,
  requireSupabaseAnonKey,
  requireServiceRoleKey,
} from './env';
