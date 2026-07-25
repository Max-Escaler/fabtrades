/// Which Supabase project this build talks to.
///
/// Nothing is baked in. A build states its environment explicitly:
///
/// ```sh
/// flutter run   --dart-define-from-file=env/production.json
/// flutter build appbundle --release --dart-define-from-file=env/staging.json
/// ```
///
/// The publishable key is not a secret — every card and price table is public
/// read-only under RLS, and only the pipeline's service role can write. The reason
/// this is a build input rather than a constant is **which project**, not secrecy.
/// A staging build that silently fell back to production would write sandbox
/// purchases and test data into real customers' accounts, so there is no fallback:
/// a build with no configuration fails at startup, loudly, where it is cheap to
/// notice.
///
/// See docs/ENVIRONMENTS.md.
class SupabaseConfig {
  const SupabaseConfig._();

  static const url = String.fromEnvironment('SUPABASE_URL');
  static const publishableKey =
      String.fromEnvironment('SUPABASE_PUBLISHABLE_KEY');

  /// `production` or `staging`. Names the environment for humans; [url] is what
  /// actually decides where data goes.
  static const environment =
      String.fromEnvironment('APP_ENV', defaultValue: 'production');

  static bool get isProduction => environment == 'production';

  static bool get isConfigured => url.isNotEmpty && publishableKey.isNotEmpty;

  /// Throws unless this build knows which project it belongs to.
  ///
  /// Called from `main` before anything reads the network, so a misconfigured
  /// build fails on the first run rather than on the first query.
  static void assertConfigured() {
    if (isConfigured) return;
    throw StateError(
      'This build has no Supabase configuration.\n'
      'Pass one at build time, for example:\n'
      '  flutter run --dart-define-from-file=env/production.json\n'
      'See docs/ENVIRONMENTS.md.',
    );
  }
}
