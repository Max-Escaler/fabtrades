# Build environments

Each file here is a set of `--dart-define` values for one environment:

```sh
flutter run --dart-define-from-file=env/production.json
flutter build appbundle --release --dart-define-from-file=env/staging.json
```

Without one of these the app throws at startup. That is deliberate — see the note
in [supabase_config.dart](../lib/core/config/supabase_config.dart).

`staging.json` ships empty because the staging project does not exist yet. Fill in
the branch's URL and publishable key once it has been created; the steps are in
[docs/ENVIRONMENTS.md](../../../docs/ENVIRONMENTS.md).

These are safe to commit. Publishable keys are public by design: every catalog
table is read-only under RLS and per-user data is scoped to `auth.uid()`. Real
secrets — RevenueCat API keys, signing keys, service-role keys — are passed
separately by CI and never live in this directory.
