import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  let supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  let supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();

  // Strip trailing slashes to prevent malformed API URLs
  while (supabaseUrl.endsWith('/')) {
    supabaseUrl = supabaseUrl.slice(0, -1);
  }

  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('your-supabase')) {
    return null;
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
