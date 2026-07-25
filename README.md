# FAB Trades

An app to balance Flesh and Blood card trades.

## Features

- **Trade Balancing**: Helps balance card trades by analyzing market prices
- **Real-time Price Data**: Up-to-date TCGplayer pricing from the shared card database
- **Discord Authentication**: Sign in with Discord to access personal features
- **Trade History**: Save and load trades from your personal history (requires authentication)
- **Trade Sharing**: Share trades via URL with anyone

## Card & Price Data

All card and price data lives in a shared Supabase Postgres database (see
[mobile/docs/DATABASE.md](./mobile/docs/DATABASE.md)). No price data is committed to this
repository.

- The **Update FAB Prices** GitHub Action
  ([.github/workflows/update-prices.yml](./.github/workflows/update-prices.yml)) runs the
  ingest pipeline ([mobile/pipeline](./mobile/pipeline)) daily, fetching TCGplayer data from
  tcgcsv.com and publishing it to the database only.
- The web app reads the catalog from the `fab_cards_with_prices` view and set metadata from
  `fab_sets` via [src/services/fabDb.js](./src/services/fabDb.js).
- The Flutter mobile app ([mobile/app](./mobile/app)) reads from the same database.
- SEO pages are pre-rendered at build time from the same database
  ([scripts/generateSeoPages.js](./scripts/generateSeoPages.js)), so production builds need
  network access to Supabase.

## Development

### Prerequisites

- Node.js (v18 or higher)
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

## License

[Add your license here]
