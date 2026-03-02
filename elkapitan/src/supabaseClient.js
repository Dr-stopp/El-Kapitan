// Creates one single Supabase connection that the whole app uses.
// Import this file anywhere i need to talk to Supabase.
//
// The URL and key are stored in .env so they're not hardcoded in your code.
// Vite reads .env automatically — VITE_ prefix is required for Vite to expose them.

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);