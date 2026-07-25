/// Deep-link configuration for browser-based sign-in.
///
/// Google and Discord send the customer to a browser and need a way back into
/// the app. That path has three parts which must agree exactly, or sign-in
/// completes in the browser and never returns:
///
/// 1. [redirectUrl] below.
/// 2. The URL scheme registered with the OS — `android/app/src/main/
///    AndroidManifest.xml` for Android, `ios/Runner/Info.plist` for iOS.
/// 3. The **Redirect URLs** allow-list in the Supabase dashboard
///    (Authentication → URL Configuration). Supabase refuses to redirect
///    anywhere not on that list, which is what stops another app registering
///    this scheme and stealing sessions.
///
/// Sign in with Apple does not use this: the native sheet returns an identity
/// token in-process, with no browser round trip.
class AuthConfig {
  const AuthConfig._();

  /// Custom scheme, matching the one registered on both platforms.
  static const scheme = 'fabtrades';

  /// Host segment of the callback. Present only so the intent filter can be
  /// narrow rather than claiming every `fabtrades://` URL.
  static const host = 'login-callback';

  static const redirectUrl = '$scheme://$host';
}
