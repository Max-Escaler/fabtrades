import fs from 'fs';
import { DIFF_CACHE_FILE } from './config.js';

export function loadDiffCache() {
    try {
        if (fs.existsSync(DIFF_CACHE_FILE)) {
            return JSON.parse(fs.readFileSync(DIFF_CACHE_FILE, 'utf8'));
        }
    } catch {
        console.warn('⚠️ new cache created.');
    }
    return {};
}

export function saveDiffCache(cache) {
    fs.writeFileSync(DIFF_CACHE_FILE, JSON.stringify(cache, null, 2));
}

export function clearDiffCache() {
    if (fs.existsSync(DIFF_CACHE_FILE)) {
        fs.unlinkSync(DIFF_CACHE_FILE);
        console.log('✅ Diff cache deleted successfully.');
    } else {
        console.log('ℹ️ empty cache to delete');
    }
}
