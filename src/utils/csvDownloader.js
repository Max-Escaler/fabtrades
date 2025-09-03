// CSV Downloader Utility with Diffing Support
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CSV_URLS_FILE = path.join(__dirname, '../../public/csv-urls.csv');
const PRICE_GUIDE_DIR = path.join(__dirname, '../../public/price-guide');
const MANIFEST_FILE = path.join(PRICE_GUIDE_DIR, 'manifest.json');
const LAST_UPDATE_FILE = path.join(PRICE_GUIDE_DIR, 'last-update.json');
const DIFF_CACHE_FILE = path.join(PRICE_GUIDE_DIR, 'diff-cache.json');

// Ensure directories exist
if (!fs.existsSync(PRICE_GUIDE_DIR)) {
  fs.mkdirSync(PRICE_GUIDE_DIR, { recursive: true });
}

// Read CSV URLs from file
function readCSVUrls() {
  try {
    const csvContent = fs.readFileSync(CSV_URLS_FILE, 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    return lines.map(line => line.trim());
  } catch (error) {
    console.error('Error reading CSV URLs file:', error);
    return [];
  }
}

// Load diff cache
function loadDiffCache() {
  try {
    if (fs.existsSync(DIFF_CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(DIFF_CACHE_FILE, 'utf8'));
    }
  } catch (error) {
    console.warn('Error loading diff cache, starting fresh');
  }
  return {};
}

// Save diff cache
function saveDiffCache(cache) {
  try {
    fs.writeFileSync(DIFF_CACHE_FILE, JSON.stringify(cache, null, 2));
  } catch (error) {
    console.error('Error saving diff cache:', error);
  }
}

// Get file hash (MD5)
function getFileHash(filePath) {
  try {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('md5').update(content).digest('hex');
  } catch (error) {
    return null;
  }
}

// Check if remote file has changed using HEAD request
async function checkRemoteFileChanged(url, localFilePath, diffCache) {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https:') ? https : http;
    const urlObj = new URL(url);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (url.startsWith('https:') ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'HEAD',
      timeout: 10000
    };

    const request = protocol.request(options, (response) => {
      const remoteInfo = {
        lastModified: response.headers['last-modified'],
        etag: response.headers['etag'],
        contentLength: response.headers['content-length'],
        statusCode: response.statusCode
      };

      // If file doesn't exist locally, it needs to be downloaded
      if (!fs.existsSync(localFilePath)) {
        resolve({ changed: true, reason: 'File does not exist locally' });
        return;
      }

      const localHash = getFileHash(localFilePath);
      const cacheKey = url;
      const cachedInfo = diffCache[cacheKey];

      // Check ETag first (most reliable)
      if (remoteInfo.etag && cachedInfo?.etag) {
        if (remoteInfo.etag !== cachedInfo.etag) {
          resolve({ changed: true, reason: 'ETag changed', remoteInfo });
          return;
        }
      }

      // Check Last-Modified header
      if (remoteInfo.lastModified && cachedInfo?.lastModified) {
        const remoteDate = new Date(remoteInfo.lastModified);
        const cachedDate = new Date(cachedInfo.lastModified);
        if (remoteDate.getTime() > cachedDate.getTime()) {
          resolve({ changed: true, reason: 'Last-Modified changed', remoteInfo });
          return;
        }
      }

      // Check content length as fallback
      if (remoteInfo.contentLength && cachedInfo?.contentLength) {
        const localStats = fs.statSync(localFilePath);
        if (parseInt(remoteInfo.contentLength) !== parseInt(cachedInfo.contentLength) ||
            parseInt(remoteInfo.contentLength) !== localStats.size) {
          resolve({ changed: true, reason: 'Content length changed', remoteInfo });
          return;
        }
      }

      // If we have a cached hash, compare it
      if (cachedInfo?.hash && localHash) {
        if (cachedInfo.hash !== localHash) {
          resolve({ changed: true, reason: 'Local file hash changed', remoteInfo });
          return;
        }
      }

      // Update cache with current info
      diffCache[cacheKey] = {
        ...remoteInfo,
        hash: localHash,
        lastChecked: new Date().toISOString()
      };

      resolve({ changed: false, reason: 'No changes detected', remoteInfo });
    });

    request.on('error', (error) => {
      console.warn(`Error checking remote file ${url}:`, error.message);
      // If we can't check, assume it needs to be downloaded
      resolve({ changed: true, reason: 'Error checking remote file' });
    });

    request.on('timeout', () => {
      request.destroy();
      console.warn(`Timeout checking remote file ${url}`);
      resolve({ changed: true, reason: 'Timeout checking remote file' });
    });

    request.end();
  });
}

// Download a single CSV file
function downloadCSV(url, outputPath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https:') ? https : http;
    
    const request = protocol.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
        return;
      }

      const fileStream = fs.createWriteStream(outputPath);
      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        resolve();
      });

      fileStream.on('error', (error) => {
        fs.unlink(outputPath, () => {}); // Delete the file if there's an error
        reject(error);
      });
    });

    request.on('error', (error) => {
      reject(error);
    });

    request.setTimeout(30000, () => {
      request.destroy();
      reject(new Error(`Timeout downloading ${url}`));
    });
  });
}

// Parse CSV line with proper quote handling
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

// Convert parsed data back to CSV string
function convertToCSV(data) {
  return data.map(row => 
    row.map(field => {
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      const escaped = field.replace(/"/g, '""');
      if (escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')) {
        return `"${escaped}"`;
      }
      return escaped;
    }).join(',')
  ).join('\n');
}

// Clean CSV by removing extDescription column
function cleanCSV(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const results = [];
    const headers = [];
    
    fs.createReadStream(inputPath)
      .pipe(csv())
      .on('headers', (headerList) => {
        // Filter out extDescription column
        headers.push(...headerList.filter(h => h !== 'extDescription'));
      })
      .on('data', (data) => {
        // Remove extDescription from each row
        const cleanedRow = {};
        Object.keys(data).forEach(key => {
          if (key !== 'extDescription') {
            cleanedRow[key] = data[key];
          }
        });
        results.push(cleanedRow);
      })
      .on('end', () => {
        try {
          // Convert back to CSV format
          const csvString = convertToCSV([headers, ...results.map(row => headers.map(h => row[h] || ''))]);
          fs.writeFileSync(outputPath, csvString);
          resolve();
        } catch (error) {
          reject(error);
        }
      })
      .on('error', reject);
  });
}

// Check if data needs to be refreshed (older than 24 hours)
function shouldRefreshData() {
  try {
    if (!fs.existsSync(LAST_UPDATE_FILE)) {
      return true;
    }
    
    const lastUpdate = JSON.parse(fs.readFileSync(LAST_UPDATE_FILE, 'utf8'));
    const lastUpdateTime = new Date(lastUpdate.timestamp);
    const now = new Date();
    const hoursSinceUpdate = (now - lastUpdateTime) / (1000 * 60 * 60);
    
    return hoursSinceUpdate >= 24;
  } catch (error) {
    console.log('Error checking last update time, will refresh data');
    return true;
  }
}

// Update last update timestamp
function updateLastUpdateTimestamp() {
  const timestamp = {
    timestamp: new Date().toISOString(),
    date: new Date().toLocaleDateString(),
    time: new Date().toLocaleTimeString()
  };
  
  fs.writeFileSync(LAST_UPDATE_FILE, JSON.stringify(timestamp, null, 2));
}

// Download all CSVs with diffing
async function downloadAllCSVs(force = false) {
  const urls = readCSVUrls();
  
  if (urls.length === 0) {
    console.log('No CSV URLs found');
    return;
  }

  // Check if refresh is needed
  if (!force && !shouldRefreshData()) {
    console.log('Data is fresh (less than 24 hours old). Use --force to override.');
    return;
  }

  console.log(`Starting diff-based download of ${urls.length} CSV files...`);
  
  const manifest = {
    lastUpdated: new Date().toISOString(),
    totalFiles: urls.length,
    files: []
  };

  const diffCache = loadDiffCache();
  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;
  let downloadedCount = 0;

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const fileName = `set_${i + 1}.csv`;
    const outputPath = path.join(PRICE_GUIDE_DIR, fileName);
    const tempPath = path.join(PRICE_GUIDE_DIR, `temp_${fileName}`);

    try {
      console.log(`Checking ${fileName} (${i + 1}/${urls.length})...`);
      
      // Check if file needs to be downloaded
      const changeResult = await checkRemoteFileChanged(url, outputPath, diffCache);
      
      if (!changeResult.changed && !force) {
        console.log(`⏭️  Skipped ${fileName} (${changeResult.reason})`);
        skippedCount++;
        
        // Still add to manifest if file exists
        if (fs.existsSync(outputPath)) {
          manifest.files.push({
            name: fileName,
            url: url,
            downloadedAt: new Date().toISOString(),
            status: 'skipped'
          });
        }
        continue;
      }

      console.log(`📥 Downloading ${fileName} (${changeResult.reason})...`);
      await downloadCSV(url, tempPath);
      
      // Clean the CSV (remove extDescription)
      await cleanCSV(tempPath, outputPath);
      
      // Remove temp file
      fs.unlinkSync(tempPath);
      
      // Update cache with new file info
      const newHash = getFileHash(outputPath);
      diffCache[url] = {
        ...diffCache[url],
        hash: newHash,
        lastDownloaded: new Date().toISOString()
      };
      
      manifest.files.push({
        name: fileName,
        url: url,
        downloadedAt: new Date().toISOString(),
        status: 'downloaded'
      });
      
      successCount++;
      downloadedCount++;
      console.log(`✓ Downloaded and cleaned ${fileName}`);
    } catch (error) {
      errorCount++;
      console.error(`✗ Failed to download ${fileName}:`, error.message);
      
      // Clean up temp file if it exists
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    }
  }

  // Save manifest and cache
  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2));
  saveDiffCache(diffCache);
  
  // Update timestamp
  updateLastUpdateTimestamp();

  console.log(`\nDownload complete!`);
  console.log(`✓ Successfully downloaded: ${downloadedCount} files`);
  console.log(`⏭️  Skipped (no changes): ${skippedCount} files`);
  console.log(`✗ Failed downloads: ${errorCount} files`);
  console.log(`📁 Files saved to: ${PRICE_GUIDE_DIR}`);
  console.log(`📋 Manifest saved to: ${MANIFEST_FILE}`);
  console.log(`🕒 Last updated: ${new Date().toLocaleString()}`);
}

// Check CSV status with diff information
function checkCSVStatus() {
  try {
    if (!fs.existsSync(MANIFEST_FILE)) {
      console.log('No CSV data found. Run download-csvs first.');
      return;
    }

    const manifest = JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8'));
    const lastUpdate = JSON.parse(fs.readFileSync(LAST_UPDATE_FILE, 'utf8'));
    const diffCache = loadDiffCache();
    
    console.log('📊 CSV Data Status:');
    console.log(`📅 Last Updated: ${lastUpdate.date} at ${lastUpdate.time}`);
    console.log(`📁 Total Files: ${manifest.totalFiles}`);
    
    const downloadedFiles = manifest.files.filter(f => f.status !== 'skipped').length;
    const skippedFiles = manifest.files.filter(f => f.status === 'skipped').length;
    
    console.log(`✅ Downloaded Files: ${downloadedFiles}`);
    console.log(`⏭️  Skipped Files: ${skippedFiles}`);
    
    const now = new Date();
    const lastUpdateTime = new Date(lastUpdate.timestamp);
    const hoursSinceUpdate = (now - lastUpdateTime) / (1000 * 60 * 60);
    
    if (hoursSinceUpdate >= 24) {
      console.log(`⚠️  Data is ${Math.floor(hoursSinceUpdate)} hours old. Consider refreshing.`);
    } else {
      console.log(`✅ Data is fresh (${Math.floor(hoursSinceUpdate)} hours old)`);
    }
    
    // Show diff cache stats
    const cacheEntries = Object.keys(diffCache).length;
    console.log(`🔍 Diff Cache Entries: ${cacheEntries}`);
    
  } catch (error) {
    console.error('Error checking CSV status:', error);
  }
}

// Get local CSV path
function getLocalCSVPath(fileName) {
  return path.join(PRICE_GUIDE_DIR, fileName);
}

// Read local CSV
function readLocalCSV(fileName) {
  const filePath = getLocalCSVPath(fileName);
  if (!fs.existsSync(filePath)) {
    throw new Error(`CSV file not found: ${fileName}`);
  }
  return fs.readFileSync(filePath, 'utf8');
}

// Clear diff cache
function clearDiffCache() {
  try {
    if (fs.existsSync(DIFF_CACHE_FILE)) {
      fs.unlinkSync(DIFF_CACHE_FILE);
      console.log('✅ Diff cache cleared');
    } else {
      console.log('ℹ️  No diff cache to clear');
    }
  } catch (error) {
    console.error('Error clearing diff cache:', error);
  }
}

export {
  readCSVUrls,
  downloadCSV,
  downloadAllCSVs,
  checkCSVStatus,
  getLocalCSVPath,
  readLocalCSV,
  shouldRefreshData,
  updateLastUpdateTimestamp,
  clearDiffCache,
  loadDiffCache,
  saveDiffCache,
  checkRemoteFileChanged,
  getFileHash
};
