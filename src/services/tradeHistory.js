import { supabase } from '../lib/supabase';

/**
 * Save a trade to the user's trade history
 * @param {string} name - The name/title of the trade
 * @param {Array} haveList - Array of cards the user has
 * @param {Array} wantList - Array of cards the user wants
 * @param {Object} totals - Object containing haveTotal, wantTotal, and diff
 * @returns {Object} - { data, error }
 */
export async function saveTradeToHistory(name, haveList, wantList, totals) {
    try {
        // Check if Supabase is configured
        if (!supabase) {
            return { data: null, error: { message: 'Authentication not configured' } };
        }

        // Check if user is authenticated
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            return { data: null, error: { message: 'You must be logged in to save trades' } };
        }

        // Validate input
        if (!name || name.trim() === '') {
            return { data: null, error: { message: 'Trade name is required' } };
        }

        // Prepare trade data
        const tradeData = {
            user_id: user.id,
            name: name.trim(),
            have_list: haveList,
            want_list: wantList,
            have_total: totals.haveTotal,
            want_total: totals.wantTotal,
            diff: totals.diff,
        };

        // Insert trade into database
        const { data, error } = await supabase
            .from('trades')
            .insert([tradeData])
            .select()
            .single();

        if (error) throw error;

        return { data, error: null };
    } catch (error) {
        console.error('Error saving trade:', error);
        return { data: null, error };
    }
}

/**
 * Get all trades for the current user
 * @returns {Object} - { data, error }
 */
export async function getUserTrades() {
    try {
        // Check if Supabase is configured
        if (!supabase) {
            return { data: null, error: { message: 'Authentication not configured' } };
        }

        // Check if user is authenticated
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            return { data: null, error: { message: 'You must be logged in to view trade history' } };
        }

        // Fetch trades ordered by most recent first
        const { data, error } = await supabase
            .from('trades')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return { data, error: null };
    } catch (error) {
        console.error('Error fetching trades:', error);
        return { data: null, error };
    }
}

/**
 * Get a specific trade by ID
 * @param {string} id - The trade ID
 * @returns {Object} - { data, error }
 */
export async function getTradeById(id) {
    try {
        // Check if Supabase is configured
        if (!supabase) {
            return { data: null, error: { message: 'Authentication not configured' } };
        }

        // Check if user is authenticated
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            return { data: null, error: { message: 'You must be logged in to view trades' } };
        }

        // Fetch specific trade
        const { data, error } = await supabase
            .from('trades')
            .select('*')
            .eq('id', id)
            .eq('user_id', user.id)
            .single();

        if (error) throw error;

        return { data, error: null };
    } catch (error) {
        console.error('Error fetching trade:', error);
        return { data: null, error };
    }
}

/**
 * Update an existing trade
 * @param {string} id - The trade ID
 * @param {Object} updates - Object containing fields to update
 * @returns {Object} - { data, error }
 */
export async function updateTrade(id, updates) {
    try {
        // Check if Supabase is configured
        if (!supabase) {
            return { data: null, error: { message: 'Authentication not configured' } };
        }

        // Check if user is authenticated
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            return { data: null, error: { message: 'You must be logged in to update trades' } };
        }

        // Update trade
        const { data, error } = await supabase
            .from('trades')
            .update({
                ...updates,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .eq('user_id', user.id)
            .select()
            .single();

        if (error) throw error;

        return { data, error: null };
    } catch (error) {
        console.error('Error updating trade:', error);
        return { data: null, error };
    }
}

/**
 * Delete a trade from history
 * @param {string} id - The trade ID
 * @returns {Object} - { data, error }
 */
export async function deleteTrade(id) {
    try {
        // Check if Supabase is configured
        if (!supabase) {
            return { data: null, error: { message: 'Authentication not configured' } };
        }

        // Check if user is authenticated
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            return { data: null, error: { message: 'You must be logged in to delete trades' } };
        }

        // Delete trade
        const { error } = await supabase
            .from('trades')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id);

        if (error) throw error;

        return { data: { success: true }, error: null };
    } catch (error) {
        console.error('Error deleting trade:', error);
        return { data: null, error };
    }
}

