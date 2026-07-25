# FAB Trades

An app to balance Flesh and Blood card trades.

## Features

- **Trade Balancing**: Helps balance card trades by analyzing market prices
- **Real-time Price Data**: Up-to-date TCGplayer pricing from the shared card database
- **Discord Authentication**: Sign in with Discord to access personal features
- **Trade History**: Save and load trades from your personal history (requires authentication)
- **Trade Sharing**: Share trades via URL with anyone

## Repository layout

One repo, two client apps sharing one Supabase backend. iOS and Android are a single
Flutter codebase, not two ports.

```
apps/
  web/                  React 19 + Vite web app, deployed to Netlify
  mobile/               Flutter app, builds both iOS and Android
services/
  price-pipeline/       Nightly TCGCSV -> Supabase price ingest (Node)
supabase/
  migrations/           Database schema, in version control
  functions/            Edge Functions
packages/
  contracts/            Golden fixtures shared by the web and mobile test suites
docs/                   Architecture, setup guides, and changelog
```

Each app owns its own dependencies, so run commands from the app directory rather than
the repo root. `packages/contracts` holds the cross-language test fixtures that keep the
duplicated JavaScript and Dart business logic honest: the same rules are implemented
twice, so the fixtures are what stop the two copies from drifting apart.

## Card & Price Data

All card and price data lives in a shared Supabase Postgres database (see
[docs/mobile/DATABASE.md](./docs/mobile/DATABASE.md)). No price data is committed to this
repository.

- The **Update FAB Prices** GitHub Action
  ([.github/workflows/update-prices.yml](./.github/workflows/update-prices.yml)) runs the
  ingest pipeline ([services/price-pipeline](./services/price-pipeline)) daily, fetching
  TCGplayer data from tcgcsv.com and publishing it to the database only.
- The web app reads the catalog from the `fab_cards_with_prices` view and set metadata from
  `fab_sets` via [apps/web/src/services/fabDb.js](./apps/web/src/services/fabDb.js).
- The Flutter mobile app ([apps/mobile](./apps/mobile)) reads from the same database.
- SEO pages are pre-rendered at build time from the same database
  ([apps/web/scripts/generateSeoPages.js](./apps/web/scripts/generateSeoPages.js)), so
  production builds need network access to Supabase.

## Development

### Prerequisites

- Node.js v18 or higher (web app, price pipeline)
- Flutter stable (mobile app)

### Web app

```bash
cd apps/web
npm install
npm run dev      # development server
npm run build    # production build + SEO prerender
npm test         # Jest suite
npm run lint
```

### Mobile app

```bash
cd apps/mobile
flutter pub get
flutter run
flutter test
flutter analyze
```

Subscription builds need their RevenueCat key passed in; debug builds fall back to the
Test Store automatically. See
[apps/mobile/lib/core/config/revenuecat_config.dart](./apps/mobile/lib/core/config/revenuecat_config.dart).

### Price pipeline

```bash
cd services/price-pipeline
npm install
npm run dry-run  # fetch and transform without writing
npm run ingest
```

### Authentication Setup

To enable Discord authentication and trade history features, follow the setup guide in
[docs/DISCORD_AUTH_SETUP.md](./docs/DISCORD_AUTH_SETUP.md).

**Note:** The app works without authentication, but you'll need to set it up to save and
access trade history.

## License

[Add your license here]
