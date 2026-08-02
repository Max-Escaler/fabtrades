import { supabase } from '../lib/supabase';
import { canAddDistinctCard } from '../utils/freeLimits';
import { fetchEntitlement } from './entitlements';

/** Conditions accepted by binder_entries / mobile BinderEntry. */
export const BINDER_CONDITIONS = ['NM', 'LP', 'MP', 'HP', 'DMG'];

/**
 * Ensure Supabase is configured and a user is authenticated.
 * @param {string} unauthedMessage
 * @returns {Promise<{ user: Object|null, error: Object|null }>}
 */
async function requireAuthenticatedUser(unauthedMessage) {
    if (!supabase) {
        return { user: null, error: { message: 'Authentication not configured' } };
    }

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { user: null, error: { message: unauthedMessage } };
    }

    return { user, error: null };
}

/**
 * Map a web catalog card (camelCase / legacy TCGCSV shape) into the mobile
 * `CardModel.toStub()` snake_case JSONB shape stored on `binder_entries.card`.
 *
 * @param {Object} card - Web card object or already-stubbed map
 * @returns {Object} Mobile-compatible stub
 */
export function cardStub(card) {
    if (!card || typeof card !== 'object') {
        return {
            id: '',
            product_id: null,
            name: '',
            set_name: null,
            sub_type_name: null,
            is_foil: false,
            rarity: null,
            collector_number: null,
            image_url: null,
            card_type: null,
            card_class: null,
            pitch: null,
            tcg_market: null,
            tcg_low: null,
            cm_trend: null,
            cm_low: null,
        };
    }

    // Already a stub (snake_case id + product_id) — pass through with defaults.
    if (card.product_id !== undefined && card.set_name !== undefined && !card.productId && !card._setName) {
        return {
            id: card.id ?? '',
            product_id: card.product_id ?? null,
            name: card.name ?? '',
            set_name: card.set_name ?? null,
            sub_type_name: card.sub_type_name ?? null,
            is_foil: Boolean(card.is_foil),
            rarity: card.rarity ?? null,
            collector_number: card.collector_number ?? null,
            image_url: card.image_url ?? null,
            card_type: card.card_type ?? null,
            card_class: card.card_class ?? null,
            pitch: card.pitch ?? null,
            tcg_market: card.tcg_market ?? null,
            tcg_low: card.tcg_low ?? null,
            cm_trend: card.cm_trend ?? null,
            cm_low: card.cm_low ?? null,
        };
    }

    const subType = card.subTypeName ?? card.sub_type_name ?? '';
    const productIdRaw = card.productId ?? card.product_id;
    let productId = null;
    if (productIdRaw !== undefined && productIdRaw !== null && productIdRaw !== '') {
        const n = Number(productIdRaw);
        productId = Number.isFinite(n) ? n : null;
    }

    const pitchRaw = card.extPitchValue ?? card.pitch;
    const pitch = pitchRaw === undefined || pitchRaw === null || pitchRaw === ''
        ? null
        : String(pitchRaw);

    return {
        id: card._uniqueId || card.id || '',
        product_id: productId,
        name: card.name || '',
        set_name: card._setName || card.setName || card.set_name || null,
        sub_type_name: subType || null,
        is_foil: Boolean(
            card.isFoil ?? card.is_foil ?? String(subType).toLowerCase().includes('foil'),
        ),
        rarity: card.extRarity || card.rarity || null,
        collector_number: card.extNumber || card.collectorNumber || card.collector_number || null,
        image_url: card.imageUrl || card.image_url || null,
        card_type: card.extCardType || card.cardType || card.card_type || null,
        card_class: card.extClass || card.cardClass || card.card_class || null,
        pitch,
        tcg_market: numOrNull(card.marketPrice ?? card.tcgMarket ?? card.tcg_market),
        tcg_low: numOrNull(card.lowPrice ?? card.tcgLow ?? card.tcg_low),
        cm_trend: numOrNull(card.cmTrend ?? card.cm_trend),
        cm_low: numOrNull(card.cmLow ?? card.cm_low),
    };
}

/**
 * Parse a mobile stub (or row.card JSONB) into a web-friendly camelCase card.
 *
 * @param {Object} stub
 * @returns {Object|null}
 */
export function parseCardStub(stub) {
    if (!stub || typeof stub !== 'object') return null;
    return {
        id: stub.id || '',
        productId: stub.product_id ?? null,
        name: stub.name || '',
        setName: stub.set_name || '',
        subTypeName: stub.sub_type_name || '',
        isFoil: Boolean(stub.is_foil),
        rarity: stub.rarity || '',
        collectorNumber: stub.collector_number || '',
        imageUrl: stub.image_url || '',
        cardType: stub.card_type || '',
        cardClass: stub.card_class || '',
        pitch: stub.pitch ?? null,
        tcgMarket: stub.tcg_market ?? null,
        tcgLow: stub.tcg_low ?? null,
        cmTrend: stub.cm_trend ?? null,
        cmLow: stub.cm_low ?? null,
    };
}

function numOrNull(value) {
    if (value === undefined || value === null || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

function mapRow(row) {
    return {
        cardId: row.card_id,
        isWanted: Boolean(row.is_wanted),
        quantity: Number(row.quantity) || 1,
        condition: row.condition || 'NM',
        card: parseCardStub(row.card),
        stub: row.card,
        addedAt: row.added_at,
        updatedAt: row.updated_at,
    };
}

/**
 * Load live binder + want-list entries for the signed-in user.
 *
 * @returns {Promise<{ data: { binder: Array, wants: Array, all: Array }|null, error: Object|null }>}
 */
export async function getBinderEntries() {
    try {
        const { user, error: authError } = await requireAuthenticatedUser(
            'You must be logged in to view your binder',
        );
        if (authError) {
            return { data: null, error: authError };
        }

        const { data, error } = await supabase
            .from('binder_entries')
            .select('*')
            .eq('user_id', user.id)
            .is('deleted_at', null)
            .order('added_at', { ascending: false });

        if (error) throw error;

        const all = (data || []).map(mapRow);
        return {
            data: {
                binder: all.filter((e) => !e.isWanted),
                wants: all.filter((e) => e.isWanted),
                all,
            },
            error: null,
        };
    } catch (error) {
        console.error('Error fetching binder entries:', error);
        return { data: null, error };
    }
}

/**
 * Upsert a binder/want entry. Identity is `(user_id, card_id, is_wanted)`.
 * Quantity must stay > 0; pass 0 (or less) to tombstone via {@link removeEntry}.
 * Sets client `updated_at` and clears `deleted_at` so a re-add resurrects a tombstone.
 *
 * @param {Object} params
 * @param {string} params.cardId
 * @param {boolean} params.isWanted
 * @param {number} params.quantity
 * @param {string} [params.condition='NM']
 * @param {Object} params.card - Web card or stub
 * @param {string} [params.addedAt] - Preserve existing added_at on updates
 * @returns {Promise<{ data: Object|null, error: Object|null }>}
 */
export async function upsertEntry({
    cardId,
    isWanted,
    quantity,
    condition = 'NM',
    card,
    addedAt,
}) {
    try {
        const { user, error: authError } = await requireAuthenticatedUser(
            'You must be logged in to update your binder',
        );
        if (authError) {
            return { data: null, error: authError };
        }

        if (!cardId) {
            return { data: null, error: { message: 'Card id is required' } };
        }

        const qty = Number(quantity);
        if (!Number.isFinite(qty) || qty <= 0) {
            return removeEntry(cardId, isWanted);
        }

        const now = new Date().toISOString();
        const row = {
            user_id: user.id,
            card_id: cardId,
            is_wanted: Boolean(isWanted),
            quantity: Math.floor(qty),
            condition: BINDER_CONDITIONS.includes(condition) ? condition : 'NM',
            card: cardStub(card),
            added_at: addedAt || now,
            updated_at: now,
            deleted_at: null,
        };

        const { data, error } = await supabase
            .from('binder_entries')
            .upsert(row, { onConflict: 'user_id,card_id,is_wanted' })
            .select()
            .single();

        if (error) throw error;

        return { data: mapRow(data), error: null };
    } catch (error) {
        console.error('Error upserting binder entry:', error);
        return { data: null, error };
    }
}

/**
 * Tombstone a binder/want entry. Never hard-deletes — mobile sync needs the row.
 *
 * @param {string} cardId
 * @param {boolean} isWanted
 * @returns {Promise<{ data: Object|null, error: Object|null }>}
 */
export async function removeEntry(cardId, isWanted) {
    try {
        const { user, error: authError } = await requireAuthenticatedUser(
            'You must be logged in to update your binder',
        );
        if (authError) {
            return { data: null, error: authError };
        }

        if (!cardId) {
            return { data: null, error: { message: 'Card id is required' } };
        }

        const now = new Date().toISOString();
        const { error } = await supabase
            .from('binder_entries')
            .update({ deleted_at: now, updated_at: now })
            .eq('user_id', user.id)
            .eq('card_id', cardId)
            .eq('is_wanted', Boolean(isWanted));

        if (error) throw error;

        return { data: { success: true }, error: null };
    } catch (error) {
        console.error('Error removing binder entry:', error);
        return { data: null, error };
    }
}

/**
 * Whether a free account may add a *new* distinct card to binder or want list.
 * Raising quantity on an existing entry is never capped (matches mobile).
 *
 * Checks the entitlement from the database so a stale UI cannot bypass the gate.
 *
 * @param {Object} params
 * @param {boolean} params.isWanted
 * @param {number} params.existingDistinctCount - Live entries already on that list
 * @param {boolean} [params.alreadyListed=false] - True when topping up an existing card
 * @returns {Promise<{ allowed: boolean, error: Object|null, isPro: boolean }>}
 */
export async function checkCanAddBinderCard({
    isWanted,
    existingDistinctCount,
    alreadyListed = false,
}) {
    try {
        const { user, error: authError } = await requireAuthenticatedUser(
            'You must be logged in to update your binder',
        );
        if (authError) {
            return { allowed: false, error: authError, isPro: false };
        }

        if (alreadyListed) {
            return { allowed: true, error: null, isPro: false };
        }

        const { entitlement } = await fetchEntitlement(user.id);
        const allowed = canAddDistinctCard(existingDistinctCount, {
            isWanted,
            isPro: entitlement.isPro,
        });

        return { allowed, error: null, isPro: entitlement.isPro };
    } catch (error) {
        console.error('Error checking binder free limit:', error);
        return { allowed: false, error, isPro: false };
    }
}

/** Opaque 32-char hex token for `/b/:token` share links. */
export function newBinderShareToken() {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Absolute URL for a binder share token.
 * @param {string} token
 * @param {string} [origin]
 * @returns {string}
 */
export function binderShareUrl(token, origin = typeof window !== 'undefined' ? window.location.origin : '') {
    if (!token) return '';
    const base = (origin || 'https://fabtrades.net').replace(/\/$/, '');
    return `${base}/b/${token}`;
}

function mapShareRow(row) {
    if (!row) return null;
    return {
        token: row.token,
        isEnabled: Boolean(row.is_enabled),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        url: binderShareUrl(row.token),
    };
}

/**
 * Load the signed-in user's binder share settings (if any).
 * @returns {Promise<{ data: Object|null, error: Object|null }>}
 */
export async function getBinderShare() {
    try {
        const { user, error: authError } = await requireAuthenticatedUser(
            'You must be logged in to manage binder sharing',
        );
        if (authError) {
            return { data: null, error: authError };
        }

        const { data, error } = await supabase
            .from('binder_shares')
            .select('token, is_enabled, created_at, updated_at')
            .eq('user_id', user.id)
            .maybeSingle();

        if (error) throw error;
        return { data: mapShareRow(data), error: null };
    } catch (error) {
        console.error('Error fetching binder share:', error);
        return { data: null, error };
    }
}

/**
 * Ensure the user has a share row and return it. Creates an enabled share on
 * first call; does not re-enable a previously disabled share.
 *
 * @returns {Promise<{ data: Object|null, error: Object|null }>}
 */
export async function ensureBinderShare() {
    try {
        const { user, error: authError } = await requireAuthenticatedUser(
            'You must be logged in to share your binder',
        );
        if (authError) {
            return { data: null, error: authError };
        }

        const existing = await getBinderShare();
        if (existing.error) return existing;
        if (existing.data) return existing;

        const now = new Date().toISOString();
        const token = newBinderShareToken();
        const { data, error } = await supabase
            .from('binder_shares')
            .insert({
                user_id: user.id,
                token,
                is_enabled: true,
                created_at: now,
                updated_at: now,
            })
            .select('token, is_enabled, created_at, updated_at')
            .single();

        if (error) throw error;
        return { data: mapShareRow(data), error: null };
    } catch (error) {
        console.error('Error ensuring binder share:', error);
        return { data: null, error };
    }
}

/**
 * Enable or disable the owner's binder share link.
 * @param {boolean} isEnabled
 * @returns {Promise<{ data: Object|null, error: Object|null }>}
 */
export async function setBinderShareEnabled(isEnabled) {
    try {
        const { user, error: authError } = await requireAuthenticatedUser(
            'You must be logged in to manage binder sharing',
        );
        if (authError) {
            return { data: null, error: authError };
        }

        const ensured = await ensureBinderShare();
        if (ensured.error) return ensured;

        const now = new Date().toISOString();
        const { data, error } = await supabase
            .from('binder_shares')
            .update({ is_enabled: Boolean(isEnabled), updated_at: now })
            .eq('user_id', user.id)
            .select('token, is_enabled, created_at, updated_at')
            .single();

        if (error) throw error;
        return { data: mapShareRow(data), error: null };
    } catch (error) {
        console.error('Error updating binder share:', error);
        return { data: null, error };
    }
}

/**
 * Mint a new token (invalidates the previous link) and enable sharing.
 * @returns {Promise<{ data: Object|null, error: Object|null }>}
 */
export async function regenerateBinderShare() {
    try {
        const { user, error: authError } = await requireAuthenticatedUser(
            'You must be logged in to manage binder sharing',
        );
        if (authError) {
            return { data: null, error: authError };
        }

        const ensured = await ensureBinderShare();
        if (ensured.error) return ensured;

        const now = new Date().toISOString();
        const token = newBinderShareToken();
        const { data, error } = await supabase
            .from('binder_shares')
            .update({ token, is_enabled: true, updated_at: now })
            .eq('user_id', user.id)
            .select('token, is_enabled, created_at, updated_at')
            .single();

        if (error) throw error;
        return { data: mapShareRow(data), error: null };
    } catch (error) {
        console.error('Error regenerating binder share:', error);
        return { data: null, error };
    }
}

/**
 * Public read of a shared binder via SECURITY DEFINER RPC.
 * @param {string} token
 * @returns {Promise<{ data: { entries: Array }|null, error: Object|null }>}
 */
export async function getPublicBinder(token) {
    try {
        if (!supabase) {
            return { data: null, error: { message: 'Authentication not configured' } };
        }
        if (!token || String(token).trim().length < 16) {
            return { data: null, error: { message: 'Invalid share link' } };
        }

        const { data, error } = await supabase.rpc('get_public_binder', {
            p_token: String(token).trim(),
        });

        if (error) throw error;
        if (!data) {
            return { data: null, error: { message: 'This binder link is unavailable' } };
        }

        const rows = Array.isArray(data.entries) ? data.entries : [];
        const entries = rows.map((row) => ({
            cardId: row.card_id,
            isWanted: false,
            quantity: Number(row.quantity) || 1,
            condition: row.condition || 'NM',
            card: parseCardStub(row.card),
            stub: row.card,
            addedAt: row.added_at,
            updatedAt: row.updated_at,
        }));

        return { data: { entries }, error: null };
    } catch (error) {
        console.error('Error fetching public binder:', error);
        return { data: null, error };
    }
}
