import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// Today's date in Nigeria, as YYYY-MM-DD
export const today = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' })
