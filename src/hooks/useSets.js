import { useState, useEffect, useMemo, useCallback } from 'react';
import { useCardData } from './useCardData.jsx';

// Module-level cache so the product groups JSON is only fetched once even
// when multiple components mount `useSets` on the same page.
let groupsCache = null;
let groupsPromise = null;

const loadGroupsCached = async () => {
    if (groupsCache) return groupsCache;
    if (groupsPromise) return groupsPromise;
    groupsPromise = (async () => {
        const response = await fetch('/productgroups.json');
        if (!response.ok) {
            groupsPromise = null;
            throw new Error(`Failed to load product groups: ${response.status}`);
        }
        const data = await response.json();
        groupsCache = Array.isArray(data?.results) ? data.results : [];
        return groupsCache;
    })();
    return groupsPromise;
};

/**
 * Slugify a set name for friendlier URLs (used as a visual aid only;
 * routes are keyed by groupId).
 */
export const slugifySetName = (name = '') =>
    name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

/**
 * Determine if a row from the consolidated data represents an actual playable
 * card (as opposed to sealed product, case, etc). Mirrors the filter used by
 * useCardData so the two views stay consistent.
 */
const isActualCard = (card) => {
    const cardType = (card.extCardType || '').trim();
    const cardNumber = (card.extNumber || '').trim();
    const rarity = (card.extRarity || '').trim();
    const cardClass = (card.extClass || '').trim();
    if (cardType !== '') return true;
    if (cardNumber !== '' && (rarity !== '' || cardClass !== '')) return true;
    return false;
};

/**
 * Loads the list of TCGplayer product groups (sets) and joins them with the
 * cards already loaded by `useCardData` so consumers can render set browsers
 * without any additional plumbing.
 */
export const useSets = () => {
    const { cards, dataReady } = useCardData();
    const [groups, setGroups] = useState(groupsCache || []);
    const [loading, setLoading] = useState(!groupsCache);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (groupsCache) {
            setGroups(groupsCache);
            setLoading(false);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                setLoading(true);
                setError(null);
                const results = await loadGroupsCached();
                if (!cancelled) setGroups(results);
            } catch (err) {
                if (!cancelled) {
                    console.error('Error loading product groups:', err);
                    setError(err.message);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    // Group cards by groupId for fast lookup and counts
    const cardsByGroupId = useMemo(() => {
        const map = new Map();
        if (!cards || cards.length === 0) return map;
        for (const card of cards) {
            if (!isActualCard(card)) continue;
            const key = String(card.groupId || '');
            if (!key) continue;
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(card);
        }
        return map;
    }, [cards]);

    /**
     * Sets enriched with stats derived from the loaded card data. Only groups
     * that actually contain playable cards are returned so the UI never shows
     * empty sets (e.g. pure sealed-product groups).
     */
    const sets = useMemo(() => {
        if (!groups || groups.length === 0) return [];
        return groups
            .map((group) => {
                const key = String(group.groupId);
                const groupCards = cardsByGroupId.get(key) || [];
                if (groupCards.length === 0) return null;

                let topMarketPrice = 0;
                for (const c of groupCards) {
                    const mp = Number(c.marketPrice) || 0;
                    if (mp > topMarketPrice) topMarketPrice = mp;
                }

                return {
                    groupId: group.groupId,
                    name: group.name || `Set ${group.groupId}`,
                    abbreviation: group.abbreviation || '',
                    publishedOn: group.publishedOn || null,
                    modifiedOn: group.modifiedOn || null,
                    isSupplemental: !!group.isSupplemental,
                    cardCount: groupCards.length,
                    topMarketPrice,
                    slug: slugifySetName(group.name || '')
                };
            })
            .filter(Boolean)
            .sort((a, b) => {
                const da = a.publishedOn ? new Date(a.publishedOn).getTime() : 0;
                const db = b.publishedOn ? new Date(b.publishedOn).getTime() : 0;
                return db - da;
            });
    }, [groups, cardsByGroupId]);

    /**
     * Look up a specific set (with its cards) by groupId. Returns null if the
     * group isn't present or has no cards.
     */
    const getSetById = useCallback((groupId) => {
        if (!groupId) return null;
        const key = String(groupId);
        const meta = groups.find((g) => String(g.groupId) === key);
        const groupCards = cardsByGroupId.get(key) || [];
        if (!meta && groupCards.length === 0) return null;
        return {
            groupId: meta?.groupId ?? groupId,
            name: meta?.name || `Set ${groupId}`,
            abbreviation: meta?.abbreviation || '',
            publishedOn: meta?.publishedOn || null,
            modifiedOn: meta?.modifiedOn || null,
            isSupplemental: !!meta?.isSupplemental,
            cards: groupCards
        };
    }, [groups, cardsByGroupId]);

    return {
        sets,
        getSetById,
        loading: loading || !dataReady,
        error
    };
};

export default useSets;
