import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // Check if environment variables are defined
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Return a mock client or partial client if environment variables are missing
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase environment variables are not set. Some features may not work properly.')
    return {
      from: () => ({
        select: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') })
      })
    } as any
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
