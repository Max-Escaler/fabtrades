#!/usr/bin/env node


// Parse command line arguments
import {checkCSVStatus, clearDiffCache, downloadFromProductsSheet, downloadAllCSVs} from "../src/services/csv/index.js";

const args = process.argv.slice(2);
const force = args.includes('--force');
const clearCache = args.includes('--clear-cache');
const statusOnly = args.includes('--status');

console.log('🔄 FAB Trades CSV Downloader (from Products Sheet)');
console.log('==================================================\n');

// Show help if requested
if (args.includes('--help') || args.includes('-h')) {
  console.log('Usage: node downloadFromProductsSheet.js [options]');
  console.log('');
  console.log('Options:');
  console.log('  --force        Force download all files regardless of changes');
  console.log('  --clear-cache  Clear the diff cache (forces full download next time)');
  console.log('  --status       Show detailed status only (no download)');
  console.log('  --help, -h     Show this help message');
  console.log('');
  console.log('Examples:');
  console.log('  node downloadFromProductsSheet.js              # Download only changed files');
  console.log('  node downloadFromProductsSheet.js --force     # Download all files');
  console.log('  node downloadFromProductsSheet.js --clear-cache # Clear cache and download all');
  console.log('  node downloadFromProductsSheet.js --status     # Show status only');
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

// Note: This script uses the legacy Google Sheets approach
// The SHEET_URL should be provided as an environment variable
const SHEET_URL = process.env.PRODUCTS_SHEET_URL;

if (!SHEET_URL) {
  console.error('❌ Error: PRODUCTS_SHEET_URL environment variable not set');
  console.log('Set it like: PRODUCTS_SHEET_URL="https://your-sheet-url" npm run download-products-sheet');
  process.exit(1);
}

// Download URLs from Products Sheet, then download CSVs
console.log('📥 Fetching URLs from Products Sheet...');
downloadFromProductsSheet(SHEET_URL)
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
