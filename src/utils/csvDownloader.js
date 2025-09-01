// CSV Downloader Utility
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const https = require('https');
const http = require('http');

// Configuration
const CSV_URLS_FILE = 'public/csv-urls.csv';
const PRICE_GUIDE_DIR = 'public/price-guide';
const MANIFEST_FILE = path.join(PRICE_GUIDE_DIR, 'manifest.json');
const LAST_UPDATE_FILE = path.join(PRICE_GUIDE_DIR, 'last-update.json');

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

// Download all CSVs
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

  console.log(`Starting download of ${urls.length} CSV files...`);
  
  const manifest = {
    lastUpdated: new Date().toISOString(),
    totalFiles: urls.length,
    files: []
  };

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const fileName = `set_${i + 1}.csv`;
    const outputPath = path.join(PRICE_GUIDE_DIR, fileName);
    const tempPath = path.join(PRICE_GUIDE_DIR, `temp_${fileName}`);

    try {
      console.log(`Downloading ${fileName} (${i + 1}/${urls.length})...`);
      await downloadCSV(url, tempPath);
      
      // Clean the CSV (remove extDescription)
      await cleanCSV(tempPath, outputPath);
      
      // Remove temp file
      fs.unlinkSync(tempPath);
      
      manifest.files.push({
        name: fileName,
        url: url,
        downloadedAt: new Date().toISOString()
      });
      
      successCount++;
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

  // Save manifest
  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2));
  
  // Update timestamp
  updateLastUpdateTimestamp();

  console.log(`\nDownload complete!`);
  console.log(`✓ Successfully downloaded: ${successCount} files`);
  console.log(`✗ Failed downloads: ${errorCount} files`);
  console.log(`📁 Files saved to: ${PRICE_GUIDE_DIR}`);
  console.log(`📋 Manifest saved to: ${MANIFEST_FILE}`);
  console.log(`🕒 Last updated: ${new Date().toLocaleString()}`);
}

// Check CSV status
function checkCSVStatus() {
  try {
    if (!fs.existsSync(MANIFEST_FILE)) {
      console.log('No CSV data found. Run download-csvs first.');
      return;
    }

    const manifest = JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8'));
    const lastUpdate = JSON.parse(fs.readFileSync(LAST_UPDATE_FILE, 'utf8'));
    
    console.log('📊 CSV Data Status:');
    console.log(`📅 Last Updated: ${lastUpdate.date} at ${lastUpdate.time}`);
    console.log(`📁 Total Files: ${manifest.totalFiles}`);
    console.log(`✅ Successfully Downloaded: ${manifest.files.length}`);
    
    const now = new Date();
    const lastUpdateTime = new Date(lastUpdate.timestamp);
    const hoursSinceUpdate = (now - lastUpdateTime) / (1000 * 60 * 60);
    
    if (hoursSinceUpdate >= 24) {
      console.log(`⚠️  Data is ${Math.floor(hoursSinceUpdate)} hours old. Consider refreshing.`);
    } else {
      console.log(`✅ Data is fresh (${Math.floor(hoursSinceUpdate)} hours old)`);
    }
    
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

module.exports = {
  readCSVUrls,
  downloadCSV,
  downloadAllCSVs,
  checkCSVStatus,
  getLocalCSVPath,
  readLocalCSV,
  shouldRefreshData,
  updateLastUpdateTimestamp
};
