#!/usr/bin/env node

// CSV Download Script
import { downloadAllCSVs, checkCSVStatus } from '../src/utils/csvDownloader.js';

// Parse command line arguments
const args = process.argv.slice(2);
const force = args.includes('--force');

console.log('🔄 FAB Trades CSV Downloader');
console.log('============================\n');

if (force) {
  console.log('⚠️  Force flag detected - will download regardless of last update time\n');
}

// Check current status first
console.log('📊 Checking current data status...');
checkCSVStatus();
console.log('');

// Download CSVs
downloadAllCSVs(force)
  .then(() => {
    console.log('\n✅ Download process completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Download process failed:', error);
    process.exit(1);
  });
