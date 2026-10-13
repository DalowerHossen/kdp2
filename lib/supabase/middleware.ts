// path: lib/supabase/middleware.ts
import { createServerClient } from '@supabase/ssr';
import type { NextRequest, NextResponse } from 'next/server';
import { NextResponse as NextResponseFactory } from 'next/server';
import { AppError } from '@/lib/contracts/errors';
import { InternalError } from '@/lib/errors/domain-errors';
import type { Database } from '@/lib/db/types';
import { getSupabasePublicConfig } from '@/lib/supabase/client';

export interface SupabaseMiddlewareResult {
  readonly response: NextResponse;
  readonly userId: string | null;
}

export async function refreshSupabaseSession(
  request: NextRequest,
): Promise<SupabaseMiddlewareResult> {
  let response = NextResponseFactory.next({ request });
  try {
    const config = getSupabasePublicConfig();
    const supabase = createServerClient<Database>(config.url, config.anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponseFactory.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });
    const { data, error } = await supabase.auth.getUser();
    if (error !== null && (error.status ?? 500) >= 500) {
      throw new InternalError();
    }
    return { response, userId: data.user?.id ?? null };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new InternalError();
  }
}
