#!/usr/bin/env node


// Parse command line arguments
import {checkCSVStatus, clearDiffCache, downloadAllCSVs} from "../src/services/csv/index.js";

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

// Download CSVs
downloadAllCSVs(force)
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
