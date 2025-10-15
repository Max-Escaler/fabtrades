import { createClient } from '@supabase/supabase-js';

// Supabase configuration
// These values come from your Supabase project settings:
// Project Settings > API
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials not configured. Authentication features will be disabled.');
}

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
    auth: {
        redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    }
});

