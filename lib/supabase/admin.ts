import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { getSupabaseEnv } from "./env"

/**
 * Server-only Supabase admin client.
 * Uses the secret key — bypasses Row Level Security.
 * NEVER import this in client components or Edge middleware.
 */
let adminClient: SupabaseClient | null = null

export function getSupabaseAdmin(): SupabaseClient {
  if (!adminClient) {
    const { url, secretKey } = getSupabaseEnv()
    adminClient = createClient(url, secretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }
  return adminClient
}

/** Lazy proxy so importing this module does not require env vars until first use. */
export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseAdmin()
    const value = Reflect.get(client, prop, client)
    return typeof value === "function" ? value.bind(client) : value
  },
})
