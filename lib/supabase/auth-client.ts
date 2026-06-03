import { createClient } from "@supabase/supabase-js"

/**
 * Server-side Supabase auth client.
 * Uses the publishable key for sign-up, sign-in, and sign-out only.
 * Respects Row Level Security — do not use for privileged data access.
 */
export function createSupabaseAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!url || !publishableKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
    )
  }

  return createClient(url, publishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
