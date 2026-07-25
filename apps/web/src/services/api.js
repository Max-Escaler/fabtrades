import { fetchPricesUpdatedAt } from './fabDb.js';

// "Prices last updated" for the header: the timestamp of the most recent
// price ingest into the shared Supabase database (the daily "Update FAB
// Prices" GitHub Action).
export async function fetchLastUpdatedTimestamp() {
    try {
        return await fetchPricesUpdatedAt();
    } catch (error) {
        console.error('Error fetching last updated timestamp:', error);
        return null;
    }
}
