#!/usr/bin/env node

import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
// Parse command line arguments
import {checkCSVStatus, clearDiffCache, downloadAllCSVs} from "../src/services/csv/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PRODUCT_GROUPS_OUTPUT = path.join(__dirname, '..', 'public', 'productgroups.json');

// Fetch product groups from the API, persist the response to
// public/productgroups.json, and construct CSV URLs for downloading.
async function fetchProductGroupUrls() {
    const PRODUCT_GROUPS_URL = 'https://tcgcsv.com/tcgplayer/62/groups';
    
    return new Promise((resolve, reject) => {
        https.get(PRODUCT_GROUPS_URL, (res) => {
            if (res.statusCode !== 200) {
                reject(new Error(`Failed to fetch product groups: ${res.statusCode}`));
                return;
            }

            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    
                    if (!json.success || !json.results || !Array.isArray(json.results)) {
                        reject(new Error('Invalid product groups response'));
                        return;
                    }

                    // Persist the full API response so consumers (e.g. the
                    // Browse Sets page) always see the latest set metadata.
                    try {
                        fs.writeFileSync(PRODUCT_GROUPS_OUTPUT, JSON.stringify(json, null, 4));
                        console.log(`💾 Saved product groups metadata to ${path.relative(process.cwd(), PRODUCT_GROUPS_OUTPUT)}`);
                    } catch (writeErr) {
                        console.warn(`⚠️  Could not write productgroups.json: ${writeErr.message}`);
                    }

                    // Construct URLs from groupIds
                    const urls = json.results.map(group => 
                        `https://tcgcsv.com/tcgplayer/62/${group.groupId}/ProductsAndPrices.csv`
                    );

                    console.log(`✅ Fetched ${urls.length} product groups from API`);
                    resolve(urls);
                } catch (err) {
                    reject(new Error(`Failed to parse product groups JSON: ${err.message}`));
                }
            });
        }).on('error', reject);
    });
}

const args = process.argv.slice(2);
const force = args.includes('--force');
const clearCache = args.includes('--clear-cache');
const statusOnly = args.includes('--status');

console.log('🔄 FAB Trades CSV Downloader (with Diffing)');
console.log('===========================================\n');

// Show help if requested
if (args.includes('--help') || args.includes('-h')) {
  console.log('Usage: node downloadCSVs.js [options]');
  console.log('');
  console.log('Options:');
  console.log('  --force        Force download all files regardless of changes');
  console.log('  --clear-cache  Clear the diff cache (forces full download next time)');
  console.log('  --status       Show detailed status only (no download)');
  console.log('  --help, -h     Show this help message');
  console.log('');
  console.log('Examples:');
  console.log('  node downloadCSVs.js              # Download only changed files');
  console.log('  node downloadCSVs.js --force     # Download all files');
  console.log('  node downloadCSVs.js --clear-cache # Clear cache and download all');
  console.log('  node downloadCSVs.js --status     # Show status only');
  process.exit(0);
}

// Clear cache if requested
if (clearCache) {
  console.log('🗑️  Clearing diff cache...');
  clearDiffCache();
  console.log('');
}

// Show status only if requested
if (statusOnly) {
  console.log('📊 Checking data status...');
  checkCSVStatus();
  process.exit(0);
}

if (force) {
  console.log('⚠️  Force flag detected - will download all files regardless of changes\n');
}

if (clearCache) {
  console.log('🔄 Cache cleared - will download all files\n');
}

// Check current status first
console.log('📊 Checking current data status...');
checkCSVStatus();
console.log('');

// Fetch product groups and download CSVs
console.log('🔍 Fetching product groups from API...');
fetchProductGroupUrls()
  .then((urls) => {
    console.log('');
    return downloadAllCSVs(urls, force);
  })
  .then(() => {
    console.log('\n✅ Download process completed!');
    console.log('\n📊 Final status:');
    checkCSVStatus();
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Download process failed:', error);
    process.exit(1);
  });
