import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const PRICE_GUIDE_DIR = path.join(__dirname, '../../public/price-guide');
export const CSV_URLS_FILE = path.join(__dirname, '../../public/csv-urls.csv');
export const LAST_UPDATE_FILE = path.join(PRICE_GUIDE_DIR, 'last-update.json');
export const MANIFEST_FILE = path.join(PRICE_GUIDE_DIR, 'manifest.json');
export const DIFF_CACHE_FILE = path.join(PRICE_GUIDE_DIR, 'diff-cache.json');

// Ensure price guide dir exists
import fs from 'fs';
if (!fs.existsSync(PRICE_GUIDE_DIR)) {
    fs.mkdirSync(PRICE_GUIDE_DIR, { recursive: true });
}
