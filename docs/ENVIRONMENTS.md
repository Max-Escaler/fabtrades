# Environments

Two environments, **production** and **staging**, and one rule: no build decides
which one it is at runtime. Every client is told at build time, and a build that is
not told fails immediately rather than defaulting to production.

That rule exists because of subscriptions. A sandbox purchase in a test build must
not be able to write a real entitlement, and the only reliable way to guarantee
that is for the test build to be physically unable to reach the production
database.

## Which project is which

| | Production | Staging |
| --- | --- | --- |
| Supabase | `tenrvaghaspwdvnwvgrh` (shared with RiftTrades) | persistent branch of it |
| Web | `fabtrades.net` via Netlify `production` context | Netlify preview/branch contexts |
| Mobile | `env/production.json` | `env/staging.json` |

Staging is a **persistent Supabase branch**, not a second project. A branch is
created from the same migrations, shares auth provider setup and `config.toml`, and
cannot drift structurally from production the way an independently-maintained
project does. It costs roughly $0.32/day while it exists.

> **Staging does not exist yet.** `apps/mobile/env/staging.json` is blank and the
> `[remotes.staging]` block in `supabase/config.toml` is commented out. Everything
> else is wired and waiting. Creating it is the section below.

## Creating the staging branch

```bash
supabase login
supabase link --project-ref tenrvaghaspwdvnwvgrh
supabase --experimental branches create staging --persistent
supabase --experimental branches list          # note BRANCH PROJECT ID
```

Then, in order:

1. **`supabase/config.toml`** — uncomment the `[remotes.staging]` block and set
   `project_id` to the branch project ref. Until it names a real branch, Supabase
   skips the whole configuration step without complaining.
2. **`apps/mobile/env/staging.json`** — fill in `SUPABASE_URL` and
   `SUPABASE_PUBLISHABLE_KEY` from the branch (Dashboard → the branch → Project
   Settings → API). `test/core/config/build_env_test.dart` checks these files are
   complete and self-consistent, so a half-filled one fails the suite.
3. **`netlify.toml`** — point `context.deploy-preview` and `context.branch-deploy`
   at the branch, as described in the comment there.
4. **Auth providers** — a branch gets its own auth settings. Add the branch's
   callback URL to Google, Discord, and Apple, per
   [AUTH_PROVIDERS.md](./AUTH_PROVIDERS.md). Mobile's `fabtrades://login-callback`
   works unchanged, since the scheme is the app's rather than the project's.
5. **Card data** — a branch starts with schema but no rows. Run the price pipeline
   against it once (`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` from the branch,
   see [services/price-pipeline](../services/price-pipeline)); the app is unusable
   without a catalog.

## How each client is told

### Mobile

`--dart-define-from-file`, one file per environment in
[apps/mobile/env](../apps/mobile/env):

```sh
flutter run --dart-define-from-file=env/production.json
flutter build appbundle --release --dart-define-from-file=env/staging.json
```

There is no default. `SupabaseConfig.assertConfigured()` runs before anything
touches the network and throws with instructions, so a forgotten flag is a startup
failure on the first run rather than a support ticket about missing data.

Outside production, Settings shows a "Test build" row naming the environment. A
tester who cannot tell which database they are pointed at will eventually report
staging data as a production bug.

The publishable keys in those files are committed deliberately: they are public by
design, gated by RLS. Real secrets stay out — RevenueCat API keys come from CI
secrets (`REVENUECAT_GOOGLE_API_KEY`, `REVENUECAT_APPLE_API_KEY`), and a build
without one runs with subscriptions switched off rather than with the test-store
key.

### Web

Vite environment variables, set per deploy context in
[netlify.toml](../netlify.toml) rather than in the Netlify dashboard, so the
mapping is reviewable:

| Variable | Meaning |
| --- | --- |
| `VITE_SUPABASE_URL` | Project REST endpoint |
| `VITE_SUPABASE_ANON_KEY` | Publishable key |
| `VITE_APP_ENV` | `production` or `staging`; naming only |

Locally, copy `apps/web/.env.example` to `apps/web/.env`.

All three are read through [`src/config/env.js`](../apps/web/src/config/env.js),
which consults Vite's `import.meta.env` in the browser and `process.env` under
Node, because `scripts/generateSeoPages.js` prerenders pages with the same Supabase
queries at build time.

### Price pipeline

Already environment-driven: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, from
GitHub secrets in CI or `services/price-pipeline/.env` locally. This one holds a
real secret — the service role key bypasses RLS. It must never appear in a client
build or in this repository.

## Release builds

| Build | Environment |
| --- | --- |
| Android (`release-android-closed.yml`) | `environment` workflow input, default `production` |
| iOS (`codemagic.yaml`) | `APP_ENVIRONMENT` variable, default `production` |
| Netlify production | `production` |
| Netlify previews | `production` today; `staging` once the branch exists |

Both mobile workflows check that the chosen env file actually has a `SUPABASE_URL`
before building, so an unfilled `staging.json` fails the build rather than shipping
an app that crashes on launch.

Use staging for anything exercising purchases. Sandbox transactions on both stores
are indistinguishable from real ones as far as the app is concerned; the database
they land in is the only boundary that holds.
