import fs from 'fs';
import { LAST_UPDATE_FILE, MANIFEST_FILE } from './config.js';

export function shouldRefreshData() {
    if (!fs.existsSync(LAST_UPDATE_FILE)) return true;
    const last = JSON.parse(fs.readFileSync(LAST_UPDATE_FILE, 'utf8'));
    const hours = (Date.now() - new Date(last.timestamp)) / 36e5;
    return hours >= 24;
}

export function updateLastUpdateTimestamp() {
    const now = new Date();
    fs.writeFileSync(LAST_UPDATE_FILE, JSON.stringify({
        timestamp: now.toISOString(),
        date: now.toLocaleDateString(),
        time: now.toLocaleTimeString()
    }, null, 2));
}

export function saveManifest(manifest) {
    fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2));
}

export function checkCSVStatus() {
    if (!fs.existsSync(MANIFEST_FILE)) {
        console.log('⚠️ No manifest found');
        return;
    }

    const manifest = JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8'));
    const lastUpdate = JSON.parse(fs.readFileSync(LAST_UPDATE_FILE, 'utf8'));

    console.log('📊 CSV Status:');
    console.log(`📅 Last update: ${lastUpdate.date} at ${lastUpdate.time}`);
    console.log(`📁 Files: ${manifest.totalFiles}`);
}
