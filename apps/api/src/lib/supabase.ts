import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env.js";

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  }

  if (!client) {
    client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return client;
}

export async function pingSupabase(): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
  if (error) {
    throw error;
  }
}
