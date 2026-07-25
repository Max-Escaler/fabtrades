import 'dart:convert';

import 'package:crypto/crypto.dart';
import 'package:flutter/foundation.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../config/auth_config.dart';
import '../models/account.dart';

/// The app's only entry point to Supabase Auth.
///
/// Two different sign-in shapes hide behind one interface:
///
/// * **Apple** uses the native system sheet and exchanges an identity token, so
///   it completes in-process and returns [SignInSucceeded].
/// * **Google and Discord** hand off to a browser and come back via a deep
///   link, so they return [SignInPending] and the session shows up later on
///   [authStateChanges].
///
/// Callers should not care which is which — they react to the auth state stream
/// either way. The distinction only exists so the UI can stop showing a spinner
/// when control has left the app.
class AuthRepository {
  AuthRepository(this._auth);

  final GoTrueClient _auth;

  /// Session restored from disk at startup, or null when signed out. Reading
  /// this synchronously means the first frame already knows.
  Session? get currentSession => _auth.currentSession;

  Account? get currentAccount {
    final user = _auth.currentUser;
    return user == null ? null : Account.fromUser(user);
  }

  /// Emits on sign-in, sign-out, and token refresh.
  Stream<AuthState> get authStateChanges => _auth.onAuthStateChange;

  /// Providers worth showing on this platform.
  ///
  /// Apple's sheet only exists on Apple platforms, so offering it on Android
  /// would be a button that cannot work. Apple does not object to Android
  /// builds omitting it — guideline 4.8 is about the iOS app.
  Future<List<AuthProviderKind>> availableProviders() async {
    final providers = <AuthProviderKind>[];
    if (await _appleIsAvailable()) providers.add(AuthProviderKind.apple);
    providers.add(AuthProviderKind.google);
    providers.add(AuthProviderKind.discord);
    return providers;
  }

  Future<bool> _appleIsAvailable() async {
    if (kIsWeb) return false;
    final isApplePlatform = defaultTargetPlatform == TargetPlatform.iOS ||
        defaultTargetPlatform == TargetPlatform.macOS;
    if (!isApplePlatform) return false;
    try {
      return await SignInWithApple.isAvailable();
    } catch (_) {
      // Plugin channel missing (widget tests) or an older OS. Either way there
      // is no sheet to show.
      return false;
    }
  }

  Future<SignInOutcome> signIn(AuthProviderKind provider) {
    return switch (provider) {
      AuthProviderKind.apple => _signInWithApple(),
      AuthProviderKind.google => _signInWithRedirect(OAuthProvider.google),
      AuthProviderKind.discord => _signInWithRedirect(OAuthProvider.discord),
    };
  }

  /// Native Sign in with Apple.
  ///
  /// The nonce is the security-relevant part. Apple receives the SHA-256 hash
  /// and embeds it in the identity token; Supabase receives the raw value and
  /// checks that it hashes to what the token claims. Without that, a token
  /// captured from one sign-in could be replayed into another.
  Future<SignInOutcome> _signInWithApple() async {
    try {
      final rawNonce = _auth.generateRawNonce();
      final hashedNonce =
          sha256.convert(utf8.encode(rawNonce)).toString();

      final credential = await SignInWithApple.getAppleIDCredential(
        scopes: const [
          AppleIDAuthorizationScopes.email,
          AppleIDAuthorizationScopes.fullName,
        ],
        nonce: hashedNonce,
      );

      final idToken = credential.identityToken;
      if (idToken == null) {
        return const SignInFailed(
          'Apple did not return a sign-in token. Please try again.',
        );
      }

      await _auth.signInWithIdToken(
        provider: OAuthProvider.apple,
        idToken: idToken,
        nonce: rawNonce,
      );
      return const SignInSucceeded();
    } on SignInWithAppleAuthorizationException catch (e) {
      if (e.code == AuthorizationErrorCode.canceled) {
        return const SignInCancelled();
      }
      return SignInFailed(_appleErrorMessage(e.code));
    } on AuthException catch (e) {
      return SignInFailed(_authErrorMessage(e));
    } catch (e) {
      debugPrint('Auth: unexpected Apple sign-in error — $e');
      return const SignInFailed(
        "Couldn't sign in with Apple. Please try again.",
      );
    }
  }

  /// Browser-based OAuth. Returns as soon as the browser is open; the session
  /// arrives via the deep link configured in [AuthConfig.redirectUrl].
  Future<SignInOutcome> _signInWithRedirect(OAuthProvider provider) async {
    try {
      final launched = await _auth.signInWithOAuth(
        provider,
        redirectTo: AuthConfig.redirectUrl,
      );
      return launched
          ? const SignInPending()
          : const SignInFailed(
              "Couldn't open the sign-in page. Check that you have a browser "
              'installed and try again.',
            );
    } on AuthException catch (e) {
      return SignInFailed(_authErrorMessage(e));
    } catch (e) {
      debugPrint('Auth: unexpected OAuth sign-in error — $e');
      return const SignInFailed("Couldn't sign in. Please try again.");
    }
  }

  /// Signs out on this device only.
  ///
  /// Deliberately local scope: signing out of the phone should not kill a
  /// session on the website, which is what `SignOutScope.global` would do.
  Future<void> signOut() async {
    try {
      await _auth.signOut(scope: SignOutScope.local);
    } on AuthException catch (e) {
      // A rejected token is the usual cause, and the local session is cleared
      // regardless, so the customer is signed out either way.
      debugPrint('Auth: sign-out reported ${e.message}');
    }
  }

  static String _appleErrorMessage(AuthorizationErrorCode code) =>
      switch (code) {
        AuthorizationErrorCode.notHandled ||
        AuthorizationErrorCode.notInteractive =>
          'Apple sign-in is unavailable right now. Please try again.',
        AuthorizationErrorCode.invalidResponse =>
          'Apple returned an unexpected response. Please try again.',
        AuthorizationErrorCode.failed =>
          "Apple sign-in didn't complete. Check that you are signed in to "
              'iCloud and try again.',
        _ => "Couldn't sign in with Apple. Please try again.",
      };

  /// Supabase's messages are written for developers, so only a few are worth
  /// passing through verbatim.
  static String _authErrorMessage(AuthException e) {
    final message = e.message.toLowerCase();
    if (message.contains('provider is not enabled')) {
      return 'That sign-in option is not enabled for FAB Trades yet.';
    }
    if (message.contains('network') || message.contains('failed host')) {
      return 'Network problem while signing in. Check your connection and try '
          'again.';
    }
    return "Couldn't sign in. Please try again.";
  }
}
