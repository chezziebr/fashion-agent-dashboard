import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.warn('Supabase environment variables not configured');
    // Return a mock client during build time
    return null as any;
  }

  return createBrowserClient(url, key);
}

// Server-side client for API routes
export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.warn('Supabase environment variables not configured');
    // Return a mock client during build time
    return null as any;
  }

  const { createClient } = require('@supabase/supabase-js');
  return createClient(url, key);
}
