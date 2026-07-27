import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { posthog } from '../lib/posthog';

const AuthContext = createContext({});

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // If Supabase is not configured, set loading to false and return
        if (!supabase) {
            setLoading(false);
            return;
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

            if (session?.user) {
                posthog.identify(session.user.id, {
                    discord_username: session.user.user_metadata?.full_name ?? session.user.user_metadata?.name,
                });
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const signInWithDiscord = async () => {
        if (!supabase) {
            return { data: null, error: { message: 'Authentication not configured' } };
        }

        try {
            posthog.capture('sign_in_initiated', { provider: 'discord' });
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'discord',
                options: {
                    redirectTo: window.location.origin,
                },
            });

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Error signing in with Discord:', error);
            posthog.captureException(error, { context: 'sign_in_with_discord' });
            return { data: null, error };
        }
    };

    const signOut = async () => {
        if (!supabase) {
            return { error: { message: 'Authentication not configured' } };
        }

        try {
            posthog.capture('sign_out');
            posthog.reset();
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            return { error: null };
        } catch (error) {
            console.error('Error signing out:', error);
            posthog.captureException(error, { context: 'sign_out' });
            return { error };
        }
    };

    const value = {
        user,
        session,
        loading,
        signInWithDiscord,
        signOut,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

