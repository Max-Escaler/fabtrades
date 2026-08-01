/// PostHog product analytics for the mobile app.
///
/// Keys come from `--dart-define-from-file` (`env/production.json` /
/// `env/staging.json`). The project API key is safe to ship in the client;
/// when it is missing, analytics silently no-ops (same pattern as RevenueCat).
///
/// Named [PostHogEnv] rather than `PostHogConfig` to avoid colliding with the
/// SDK's `PostHogConfig` class.
abstract final class PostHogEnv {
  static const apiKey = String.fromEnvironment('POSTHOG_API_KEY');
  static const host = String.fromEnvironment(
    'POSTHOG_HOST',
    defaultValue: 'https://us.i.posthog.com',
  );

  static bool get isConfigured => apiKey.isNotEmpty;
}
