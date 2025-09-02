import { execSync } from 'child_process';
import { downloadAllCSVs, checkCSVStatus } from '../src/utils/csvDownloader.js';

console.log('🏗️  FAB Trades Build with CSV Refresh');
console.log('====================================\n');

async function buildWithCSVRefresh() {
  try {
    // Check current CSV status
    console.log('📊 Checking CSV data status...');
    checkCSVStatus();
    console.log('');

    // Download fresh CSV data if needed
    console.log('🔄 Checking if CSV data needs refresh...');
    await downloadAllCSVs(false); // false = don't force, only if needed
    console.log('');

    // Run the build
    console.log('🏗️  Building application...');
    execSync('npm run build', { stdio: 'inherit' });
    
    console.log('\n✅ Build completed successfully!');
    console.log('📁 Built files are in the dist/ directory');
    
  } catch (error) {
    console.error('\n❌ Build failed:', error.message);
    process.exit(1);
  }
}

buildWithCSVRefresh();
