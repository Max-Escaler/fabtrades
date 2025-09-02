#!/usr/bin/env node

// Test script to demonstrate diffing functionality
import { checkRemoteFileChanged, loadDiffCache, clearDiffCache } from '../src/utils/csvDownloader.js';
import fs from 'fs';
import path from 'path';

console.log('🧪 Testing CSV Diffing Functionality');
console.log('====================================\n');

// Sample URLs to test
const testUrls = [
  'https://tcgcsv.com/tcgplayer/62/2724/ProductsAndPrices.csv',
  'https://tcgcsv.com/tcgplayer/62/2725/ProductsAndPrices.csv',
  'https://tcgcsv.com/tcgplayer/62/2726/ProductsAndPrices.csv'
];

async function testDiffing() {
  console.log('📋 Test URLs:');
  testUrls.forEach((url, index) => {
    console.log(`  ${index + 1}. ${url}`);
  });
  console.log('');

  // Clear cache for fresh test
  console.log('🗑️  Clearing cache for fresh test...');
  clearDiffCache();
  console.log('');

  const diffCache = loadDiffCache();
  
  for (let i = 0; i < testUrls.length; i++) {
    const url = testUrls[i];
    const fileName = `test_set_${i + 1}.csv`;
    const localPath = path.join(process.cwd(), 'public', 'price-guide', fileName);
    
    console.log(`🔍 Testing ${fileName}...`);
    
    try {
      // First check - should indicate file needs to be downloaded
      const result1 = await checkRemoteFileChanged(url, localPath, diffCache);
      console.log(`  First check: ${result1.changed ? '📥 Needs download' : '⏭️  No changes'} (${result1.reason})`);
      
      // Simulate downloading the file (create a dummy file)
      const dummyContent = `productId,name,test\n123,Test Product,${Date.now()}`;
      fs.writeFileSync(localPath, dummyContent);
      console.log(`  📝 Created dummy file`);
      
      // Second check - should indicate no changes needed
      const result2 = await checkRemoteFileChanged(url, localPath, diffCache);
      console.log(`  Second check: ${result2.changed ? '📥 Needs download' : '⏭️  No changes'} (${result2.reason})`);
      
      // Clean up
      if (fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
        console.log(`  🗑️  Cleaned up dummy file`);
      }
      
    } catch (error) {
      console.error(`  ❌ Error testing ${fileName}:`, error.message);
    }
    
    console.log('');
  }
  
  // Show final cache state
  const finalCache = loadDiffCache();
  console.log('📊 Final cache state:');
  console.log(`  Cache entries: ${Object.keys(finalCache).length}`);
  Object.keys(finalCache).forEach((url, index) => {
    const entry = finalCache[url];
    console.log(`  ${index + 1}. ${url}`);
    console.log(`     ETag: ${entry.etag || 'N/A'}`);
    console.log(`     Last-Modified: ${entry.lastModified || 'N/A'}`);
    console.log(`     Content-Length: ${entry.contentLength || 'N/A'}`);
    console.log(`     Hash: ${entry.hash ? entry.hash.substring(0, 8) + '...' : 'N/A'}`);
  });
  
  console.log('\n✅ Diffing test completed!');
}

testDiffing().catch(console.error);
