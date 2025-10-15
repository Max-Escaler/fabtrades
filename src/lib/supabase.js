import { createClient } from '@supabase/supabase-js';

// Supabase configuration
// These values come from your Supabase project settings:
// Project Settings > API
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Only create client if credentials are provided
let supabaseClient = null;

if (supabaseUrl && supabaseAnonKey) {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true
        }
    });
} else {
    console.warn('Supabase credentials not configured. Authentication features will be disabled.');
}

// Export the client (will be null if not configured)
export const supabase = supabaseClient;

