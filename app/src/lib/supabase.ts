import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { demoStep } from '../dev/demo';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copy .env.example to .env.local and fill them in.'
  );
}

// Dev-only demo mode (see src/dev/demo.ts): an inert stand-in where every
// call chain resolves to { data: null, error: null }, so writes "succeed"
// without touching the real project.
function inertClient(): SupabaseClient {
  const result = { data: null, error: null };
  const chain: unknown = new Proxy(function () {}, {
    get: (_t, prop) => (prop === 'then' ? (resolve: (v: unknown) => void) => resolve(result) : chain),
    apply: () => chain,
  });
  return chain as SupabaseClient;
}

export const supabase = import.meta.env.DEV && demoStep() ? inertClient() : createClient(url, anonKey);
