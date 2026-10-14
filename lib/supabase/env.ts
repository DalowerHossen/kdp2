// path: lib/supabase/env.ts
/** Supabase environment accessors. Lazy by design: importing never throws. */

export function supabaseUrl(): string | null {
  const v = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return v === undefined || v === '' ? null : v;
}

export function supabaseAnonKey(): string | null {
  const v = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return v === undefined || v === '' ? null : v;
}

export function supabaseServiceRoleKey(): string | null {
  const v = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return v === undefined || v === '' ? null : v;
}

export function isSupabaseConfigured(): boolean {
  return supabaseUrl() !== null && supabaseAnonKey() !== null;
}

export function requireSupabaseUrl(): string {
  const v = supabaseUrl();
  if (v === null) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured.');
  return v;
}

export function requireSupabaseAnonKey(): string {
  const v = supabaseAnonKey();
  if (v === null) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured.');
  return v;
}

export function requireServiceRoleKey(): string {
  const v = supabaseServiceRoleKey();
  if (v === null) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured.');
  return v;
}
