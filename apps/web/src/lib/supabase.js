import { createClient } from '@supabase/supabase-js';
import { supabaseCredentials } from '../config/env.js';

// Only create client if credentials are provided
let supabaseClient = null;

const credentials = supabaseCredentials();
if (credentials) {
    supabaseClient = createClient(credentials.url, credentials.key, {
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

