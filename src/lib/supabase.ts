import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _supabase: SupabaseClient | null = null;

const SUPABASE_URL = "https://qzlsccxuokfzwdlqrohx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6bHNjY3h1b2tmendkbHFyb2h4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2NjI2MDcsImV4cCI6MjA5ODIzODYwN30.CkJ5euA6wQFO0LcQawElxx6haSyA11ARcYjsxPloI7s";

function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
      },
    });
  }
  return _supabase;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabase();
    return (client as any)[prop];
  },
});

export function isSupabaseReady(): boolean {
  return true;
}

export async function fetchData<T>(
  query: Promise<{ data: T | null; error: any }>
): Promise<T> {
  const { data, error } = await query;
  if (error) throw error;
  return data as T;
}
