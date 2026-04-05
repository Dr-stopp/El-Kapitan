import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

if (!isSupabaseConfigured) {
  console.warn(
    '[El-Kapitan] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Create frontend/frontend/.env (see .env.example).'
  )
}

/** Null when env is missing — callers must check (avoids crash on import). */
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null
