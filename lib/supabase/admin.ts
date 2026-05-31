import { createClient } from "@supabase/supabase-js"

/**
 * Server-only Supabase admin client.
 * Uses the secret key — bypasses Row Level Security.
 * NEVER import this in client components.
 */
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

export { supabaseAdmin }
