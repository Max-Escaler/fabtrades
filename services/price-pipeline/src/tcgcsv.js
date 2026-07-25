import Papa from 'papaparse';
import { TCGCSV_BASE, HTTP_HEADERS } from './config.js';

// Sets are TCGplayer "groups". Returns [{ groupId, name, ... }].
export async function fetchGroups() {
  const res = await fetch(`${TCGCSV_BASE}/groups`, { headers: HTTP_HEADERS });
  if (!res.ok) {
    throw new Error(`Failed to fetch groups: ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  if (!json.success || !Array.isArray(json.results)) {
    throw new Error('Invalid groups response from TCGCSV');
  }
  return json.results;
}

// Products + prices for one set, parsed from ProductsAndPrices.csv.
export async function fetchGroupProducts(groupId) {
  const url = `${TCGCSV_BASE}/${groupId}/ProductsAndPrices.csv`;
  const res = await fetch(url, { headers: HTTP_HEADERS });
  if (!res.ok) {
    throw new Error(`Failed to fetch products for group ${groupId}: ${res.status} ${res.statusText}`);
  }
  const csvText = await res.text();
  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
    transform: (v) => (typeof v === 'string' ? v.trim() : v)
  });
  if (parsed.errors?.length) {
    console.warn(`   ⚠ CSV warnings for group ${groupId}:`, parsed.errors.slice(0, 3));
  }
  return parsed.data;
}
