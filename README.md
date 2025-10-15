# FAB Trades

An app to balance Flesh and Blood card trades with efficient CSV data management.

## Features

- **Smart CSV Diffing**: Only downloads files that have actually changed, saving bandwidth and time
- **Automatic Data Management**: Downloads and processes TCGPlayer CSV data automatically
- **Trade Balancing**: Helps balance card trades by analyzing market prices
- **Real-time Price Data**: Uses up-to-date pricing information from TCGPlayer
- **Discord Authentication**: Sign in with Discord to access personal features
- **Trade History**: Save and load trades from your personal history (requires authentication)
- **Trade Sharing**: Share trades via URL with anyone

## CSV Data Management

The app includes an intelligent CSV downloader that uses multiple strategies to determine if files need to be updated:

### Diffing Strategies

1. **ETag Comparison**: Most reliable method - compares ETag headers from the server
2. **Last-Modified Check**: Compares Last-Modified headers to detect changes
3. **Content Length**: Fallback method using file size comparison
4. **Local Hash Verification**: MD5 hash comparison for local file integrity

### Usage

```bash
# Download only changed files (recommended)
node scripts/downloadCSVs.js

# Force download all files
node scripts/downloadCSVs.js --force

# Clear diff cache and download all files
node scripts/downloadCSVs.js --clear-cache

# Show detailed status only
node scripts/downloadCSVs.js --status

# Show help
node scripts/downloadCSVs.js --help
```

### Benefits

- **Efficiency**: Only downloads files that have actually changed
- **Speed**: Subsequent runs are much faster
- **Bandwidth Savings**: Reduces unnecessary downloads
- **Reliability**: Multiple fallback strategies ensure data integrity

### Cache Management

The diffing system maintains a cache file (`public/price-guide/diff-cache.json`) that stores:
- ETag values
- Last-Modified timestamps
- Content lengths
- Local file hashes
- Check timestamps

You can clear this cache anytime with `--clear-cache` to force a full download.

## Development

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

```bash
npm install
```

### Authentication Setup

To enable Discord authentication and trade history features, follow the setup guide in [DISCORD_AUTH_SETUP.md](./DISCORD_AUTH_SETUP.md).

**Note:** The app works without authentication, but you'll need to set it up to save and access trade history.

### Running the App

```bash
# Development mode
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

### Testing Diffing Functionality

```bash
# Test the diffing system
node scripts/testDiffing.js
```

## Data Sources

The app downloads CSV data from TCGPlayer via tcgcsv.com, including:
- Product information
- Current market prices
- Historical price data
- Card metadata

## License

[Add your license here]
