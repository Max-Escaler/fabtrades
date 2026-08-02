import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

/** OAuth providers available on web (browser redirect flow). */
export const OAUTH_PROVIDERS = ['discord', 'google', 'apple'];

/**
 * Read OAuth failure params Supabase appends when the provider callback fails
 * (e.g. Apple `invalid_client`). Without this the user lands signed-out with
 * no explanation.
 */
function readOAuthRedirectError() {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash.startsWith('#')
        ? window.location.hash.slice(1)
        : window.location.hash;
    const hashParams = new URLSearchParams(hash);
    const error = params.get('error') || hashParams.get('error');
    const description =
        params.get('error_description') || hashParams.get('error_description');
    if (!error && !description) return null;
    return description || error;
}

function clearOAuthRedirectParams() {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.delete('error');
    url.searchParams.delete('error_description');
    url.searchParams.delete('error_code');
    // Keep path; drop auth error query so a refresh does not re-show the alert.
    window.history.replaceState({}, '', url.pathname + url.search + url.hash);
}

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState(null);

    useEffect(() => {
        // If Supabase is not configured, set loading to false and return
        if (!supabase) {
            setLoading(false);
            return;
        }

        const redirectError = readOAuthRedirectError();
        if (redirectError) {
            setAuthError(redirectError.replace(/\+/g, ' '));
            clearOAuthRedirectParams();
        }

        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
            if (session) setAuthError(null);
        });

        return () => subscription.unsubscribe();
    }, []);

    /**
     * Start an OAuth browser redirect for Discord, Google, or Apple.
     * @param {'discord'|'google'|'apple'} provider
     */
    const signInWithProvider = async (provider) => {
        if (!supabase) {
            return { data: null, error: { message: 'Authentication not configured' } };
        }

        if (!OAUTH_PROVIDERS.includes(provider)) {
            return { data: null, error: { message: `Unsupported provider: ${provider}` } };
        }

        try {
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo: window.location.origin,
                },
            });

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error(`Error signing in with ${provider}:`, error);
            return { data: null, error };
        }
    };

    /** @deprecated Prefer signInWithProvider('discord') */
    const signInWithDiscord = () => signInWithProvider('discord');

    /**
     * Email/password sign-in.
     * @param {string} email
     * @param {string} password
     */
    const signInWithEmail = async (email, password) => {
        if (!supabase) {
            return { data: null, error: { message: 'Authentication not configured' } };
        }

        const trimmed = (email || '').trim();
        if (!trimmed || !password) {
            return { data: null, error: { message: 'Enter your email and password.' } };
        }

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: trimmed,
                password,
            });
            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Error signing in with email:', error);
            return { data: null, error };
        }
    };

    /**
     * Email/password sign-up. When the project requires confirmation, Supabase
     * returns a user with no session — callers should show confirmation messaging.
     * @param {string} email
     * @param {string} password
     */
    const signUpWithEmail = async (email, password) => {
        if (!supabase) {
            return { data: null, error: { message: 'Authentication not configured' } };
        }

        const trimmed = (email || '').trim();
        if (!trimmed || !password) {
            return { data: null, error: { message: 'Enter your email and password.' } };
        }
        if (password.length < 6) {
            return { data: null, error: { message: 'Password must be at least 6 characters.' } };
        }

        try {
            const { data, error } = await supabase.auth.signUp({
                email: trimmed,
                password,
                options: {
                    emailRedirectTo: window.location.origin,
                },
            });
            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Error signing up with email:', error);
            return { data: null, error };
        }
    };

    const signOut = async () => {
        if (!supabase) {
            return { error: { message: 'Authentication not configured' } };
        }

        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            return { error: null };
        } catch (error) {
            console.error('Error signing out:', error);
            return { error };
        }
    };

    const value = {
        user,
        session,
        loading,
        authError,
        clearAuthError: () => setAuthError(null),
        signInWithProvider,
        signInWithDiscord,
        signInWithEmail,
        signUpWithEmail,
        signOut,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
