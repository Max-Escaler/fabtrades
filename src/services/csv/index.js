import fs from 'fs';
import path from 'path';
import https from 'https';
import csv from 'csv-parser';
import { CSV_URLS_FILE, PRICE_GUIDE_DIR } from './config.js';
import { loadDiffCache, saveDiffCache, clearDiffCache } from './cache.js';
import { downloadCSV, cleanCSV, getFileHash } from './downloader.js';
import { checkRemoteFileChanged } from './diffChecker.js';
import { shouldRefreshData, updateLastUpdateTimestamp, saveManifest, checkCSVStatus } from './updater.js';

function readCSVUrls() {
    if (!fs.existsSync(CSV_URLS_FILE)) return [];
    return fs.readFileSync(CSV_URLS_FILE, 'utf8')
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean);
}

// 🔹 Récupération des URLs depuis Google Sheet
export async function downloadFromProductsSheet(sheetUrl) {
    return new Promise((resolve, reject) => {
        const urls = [];

        https.get(sheetUrl, (res) => {
            if (res.statusCode !== 200) {
                reject(new Error(`Erreur téléchargement sheet: ${res.statusCode}`));
                return;
            }

            res.pipe(csv())
                .on('data', (row) => {
                    if (row.url) urls.push(row.url.trim());
                })
                .on('end', () => {
                    if (!urls.length) {
                        reject(new Error('Aucune URL trouvée dans le sheet'));
                        return;
                    }

                    fs.writeFileSync(CSV_URLS_FILE, urls.join('\n'));
                    console.log(`✅ ${urls.length} URLs sauvegardées dans ${CSV_URLS_FILE}`);
                    resolve(urls);
                })
                .on('error', reject);
        }).on('error', reject);
    });
}

export async function downloadAllCSVs(force = false) {
    const urls = readCSVUrls();
    if (!urls.length) {
        console.log('⚠️ Pas d’URL CSV trouvées');
        return;
    }

    if (!force && !shouldRefreshData()) {
        console.log('⏭️ Données fraîches, pas besoin de re-télécharger');
        return;
    }

    const diffCache = loadDiffCache();
    const manifest = { lastUpdated: new Date().toISOString(), totalFiles: urls.length, files: [] };

    for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        const fileName = `set_${i + 1}.csv`;
        const outputPath = path.join(PRICE_GUIDE_DIR, fileName);
        const tempPath = path.join(PRICE_GUIDE_DIR, `temp_${fileName}`);

        try {
            const change = await checkRemoteFileChanged(url, outputPath, diffCache);
            if (!change.changed && !force) {
                console.log(`⏭️ ${fileName} ignoré (${change.reason})`);
                continue;
            }

            await downloadCSV(url, tempPath);
            await cleanCSV(tempPath, outputPath);
            fs.unlinkSync(tempPath);

            diffCache[url] = { hash: getFileHash(outputPath), lastDownloaded: new Date().toISOString() };

            manifest.files.push({ name: fileName, url, status: 'downloaded' });
            console.log(`✓ ${fileName} téléchargé et nettoyé`);
        } catch (err) {
            console.error(`✗ Erreur sur ${fileName}: ${err.message}`);
        }
    }

    saveManifest(manifest);
    saveDiffCache(diffCache);
    updateLastUpdateTimestamp();

    console.log('✅ Téléchargement terminé !');
}

export {
    clearDiffCache,
    checkCSVStatus
};
