import { createClient } from "@supabase/supabase-js"
import { getSupabaseEnv } from "./env"

/**
 * Server-side Supabase auth client.
 * Uses the publishable key for sign-up, sign-in, and sign-out only.
 * Respects Row Level Security — do not use for privileged data access.
 */
export function createSupabaseAuthClient() {
  const { url, publishableKey } = getSupabaseEnv()

  return createClient(url, publishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
