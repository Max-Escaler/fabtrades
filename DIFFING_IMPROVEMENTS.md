# CSV Downloader Diffing Improvements

## Overview

The CSV downloader has been significantly enhanced with intelligent diffing capabilities to only download files that have actually changed, making it much more efficient and reducing unnecessary bandwidth usage.

## Key Improvements

### 1. Multi-Strategy Diffing

The system now uses multiple strategies to determine if a file needs to be downloaded:

#### ETag Comparison (Primary)
- Most reliable method for detecting changes
- Compares ETag headers from the server
- Provides strong guarantees about file changes

#### Last-Modified Check (Secondary)
- Compares Last-Modified headers
- Useful when ETag is not available
- Good for detecting timestamp-based changes

#### Content Length Comparison (Fallback)
- Compares file sizes
- Simple but effective fallback method
- Handles cases where other headers are missing

#### Local Hash Verification (Integrity)
- MD5 hash comparison for local files
- Ensures local file integrity
- Detects local file corruption

### 2. Intelligent Caching

The system maintains a persistent cache (`diff-cache.json`) that stores:
- ETag values for each URL
- Last-Modified timestamps
- Content lengths
- Local file hashes
- Check timestamps

This cache persists between runs, allowing the system to make informed decisions about what needs to be downloaded.

### 3. Enhanced Command Line Interface

New command-line options provide better control:

```bash
# Download only changed files (default behavior)
node scripts/downloadCSVs.js

# Force download all files
node scripts/downloadCSVs.js --force

# Clear cache and download all files
node scripts/downloadCSVs.js --clear-cache

# Show detailed status only
node scripts/downloadCSVs.js --status

# Show help
node scripts/downloadCSVs.js --help
```

### 4. Improved Status Reporting

The status command now shows:
- Number of downloaded vs skipped files
- Diff cache statistics
- Detailed change reasons
- Cache entry information

## Performance Benefits

### Before (Old System)
- Downloads all 83 CSV files every time
- No change detection
- Wastes bandwidth on unchanged files
- Slower subsequent runs

### After (New System)
- Only downloads files that have actually changed
- Intelligent change detection
- Significant bandwidth savings
- Much faster subsequent runs

## Technical Implementation

### Core Functions

1. **`checkRemoteFileChanged(url, localFilePath, diffCache)`**
   - Performs HEAD request to check remote file status
   - Compares multiple change indicators
   - Returns detailed change information

2. **`loadDiffCache()` / `saveDiffCache(cache)`**
   - Manages persistent cache storage
   - Handles cache serialization/deserialization

3. **`getFileHash(filePath)`**
   - Generates MD5 hash for local files
   - Used for integrity checking

### Error Handling

The system gracefully handles:
- Network timeouts
- Missing HTTP headers
- File system errors
- Cache corruption

When errors occur, the system defaults to downloading the file to ensure data integrity.

## Usage Examples

### Normal Operation
```bash
# First run - downloads all files
node scripts/downloadCSVs.js

# Subsequent runs - only downloads changed files
node scripts/downloadCSVs.js
```

### Force Operations
```bash
# Force download all files
node scripts/downloadCSVs.js --force

# Clear cache and download all files
node scripts/downloadCSVs.js --clear-cache
```

### Monitoring
```bash
# Check current status
node scripts/downloadCSVs.js --status

# Test diffing functionality
node scripts/testDiffing.js
```

## Cache Management

The diff cache is stored in `public/price-guide/diff-cache.json` and contains:

```json
{
  "https://example.com/file.csv": {
    "etag": "\"abc123\"",
    "lastModified": "Mon, 02 Sep 2025 14:16:03 GMT",
    "contentLength": "12345",
    "hash": "d41d8cd98f00b204e9800998ecf8427e",
    "lastChecked": "2025-09-02T14:16:03.131Z",
    "lastDownloaded": "2025-09-02T14:16:03.615Z"
  }
}
```

## Testing

A comprehensive test script (`scripts/testDiffing.js`) demonstrates:
- Diffing functionality
- Cache management
- Error handling
- Status reporting

## Future Enhancements

Potential future improvements:
- Parallel downloads for changed files
- Incremental updates (partial file downloads)
- Compression support
- More sophisticated change detection algorithms
- Webhook notifications for changes

## Conclusion

The diffing improvements make the CSV downloader significantly more efficient and user-friendly. The system now intelligently manages downloads, saving time and bandwidth while maintaining data integrity.
