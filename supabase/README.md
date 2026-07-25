# Supabase

Database schema and Edge Functions for FAB Trades.

## This project is shared

The Supabase project `tenrvaghaspwdvnwvgrh` backs two products:

- **FAB Trades** owns the `fab_*` tables and `trades`. Those are the migrations in
  this directory.
- **RiftTrades** owns the unprefixed equivalents (`sets`, `cards`, `card_prices`,
  `price_history`, `pipeline_runs`, `app_config`). Its migrations live in that
  product's repository.

So the version numbers here have gaps, and that is deliberate — the missing
versions belong to RiftTrades. Two consequences worth knowing:

- `supabase db push` from this repo only ever touches FAB objects.
- `supabase db reset` against a local stack gives you a FAB-only database. That is
  enough to run and test both clients, since neither reads the Riftbound tables.

Before adding a table, prefix it `fab_` unless it is genuinely shared. `trades`
predates this convention and is FAB-only despite the bare name.

## User data and sync

`binder_entries`, `lend_groups`, `user_settings`, and `trades` are the synced
per-account tables. They are keyed on `(user_id, client_id)` rather than `id`, and
deletes are tombstones (`deleted_at`) rather than row removals — both for reasons
that only make sense in the context of the reconciliation model, which is written
up in [docs/CLOUD_SYNC.md](../docs/CLOUD_SYNC.md). Read that before changing them.

## Layout

```
migrations/    Schema changes, applied in filename order
functions/     Edge Functions (Deno)
config.toml    Local stack + CLI configuration
```

## Working on the schema

The CLI is not committed as a dependency; install it per the
[Supabase docs](https://supabase.com/docs/guides/local-development).

```bash
supabase link --project-ref tenrvaghaspwdvnwvgrh
supabase db diff -f describe_your_change   # generate a migration from local edits
supabase db push                           # apply pending migrations to the linked project
supabase migration list                    # compare local and remote history
```

Never edit an already-applied migration. The remote records a checksum per
version, so amending one makes local and remote disagree in a way that is
tedious to unpick. Add a new migration instead.

## Authentication

Three providers, enabled for both clients: Apple, Google, and Discord. `config.toml`
declares them, but a linked project reads its provider settings from the dashboard
rather than from this file, so changes there must be made in both places.
[docs/AUTH_PROVIDERS.md](../docs/AUTH_PROVIDERS.md) covers the dashboard and
per-provider console setup.

The one setting that silently breaks mobile sign-in if missed:
`fabtrades://login-callback` must appear in **Authentication → URL Configuration →
Redirect URLs**. Without it Google and Discord sign-in completes in the browser and
never returns to the app.

## Row Level Security

Every table has RLS enabled. The rules are:

- **Catalog** (`fab_sets`, `fab_cards`, `fab_card_prices`, `fab_price_history`,
  `fab_app_config`) — public `select` for `anon` and `authenticated`. Prices are
  public information and both clients read them without signing in.
- **`fab_pipeline_runs`** — RLS enabled with no policy at all, so only the service
  role can see it. Ingest logs are operational data, not user data.
- **User data** (`trades`, `binder_entries`, `lend_groups`, `user_settings`) —
  `select`/`insert`/`update`/`delete` restricted to `auth.uid() = user_id`.

The price pipeline writes with the service role, which bypasses RLS. That is why
no catalog table needs an insert or update policy.
