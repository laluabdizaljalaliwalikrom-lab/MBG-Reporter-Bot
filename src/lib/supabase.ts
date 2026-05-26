import { createClient } from '@supabase/supabase-js';

// NEXT_PUBLIC_ prefix exposes these to the browser (client components).
// Non-prefixed versions are still used server-side (API routes, Server Components).
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  'https://placeholder.supabase.co';

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  'placeholder';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

