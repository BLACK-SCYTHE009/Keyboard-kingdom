import { createClient } from "@supabase/supabase-js";

type SupabaseClientOptions = Parameters<typeof createClient>[2];

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const serverOptions: SupabaseClientOptions = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
};

function requireEnv(value: string | undefined, name: string) {
  if (!value) {
    throw new Error(`Missing ${name}. Add it to your environment before using Supabase.`);
  }
  return value;
}

export function createSupabaseAdminClient() {
  return createClient(
    requireEnv(supabaseUrl, "NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv(supabaseServiceRoleKey, "SUPABASE_SERVICE_ROLE_KEY"),
    serverOptions,
  );
}

export function createSupabaseBrowserClient() {
  return createClient(
    requireEnv(supabaseUrl, "NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv(supabaseAnonKey, "NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  );
}
