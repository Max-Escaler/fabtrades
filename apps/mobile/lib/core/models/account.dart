import 'package:supabase_flutter/supabase_flutter.dart';

/// Which third-party identity a customer signed in with.
///
/// Apple is not optional: App Review guideline 4.8 requires an equivalent
/// privacy-preserving login option once any other third-party sign-in is
/// offered, and Apple's own is the simplest way to satisfy it.
enum AuthProviderKind {
  apple('apple', 'Apple'),
  google('google', 'Google'),
  discord('discord', 'Discord'),
  /// Email/password via Supabase Auth. Used for App Review demo accounts and
  /// customers who prefer not to use a third-party identity.
  email('email', 'Email');

  const AuthProviderKind(this.id, this.label);

  /// Matches Supabase's provider identifier, so this maps straight onto
  /// `OAuthProvider` and onto `app_metadata.provider` coming back.
  final String id;

  /// Name shown in sign-in buttons and account status.
  final String label;

  static AuthProviderKind? fromId(String? id) {
    for (final kind in values) {
      if (kind.id == id) return kind;
    }
    return null;
  }
}

/// The signed-in customer, flattened out of Supabase's [User].
///
/// Provider metadata is inconsistent — Discord sends `full_name`, Google sends
/// `name`, and Apple often sends nothing but an email (and only sends a name on
/// the very first authorization). Resolving that mess once here keeps the
/// guesswork out of the widgets.
class Account {
  const Account({
    required this.id,
    this.email,
    this.displayName,
    this.avatarUrl,
    this.provider,
  });

  factory Account.fromUser(User user) {
    final metadata = user.userMetadata ?? const <String, dynamic>{};

    String? firstNonEmpty(List<String> keys) {
      for (final key in keys) {
        final value = metadata[key];
        if (value is String && value.trim().isNotEmpty) return value.trim();
      }
      return null;
    }

    return Account(
      id: user.id,
      email: user.email,
      displayName: firstNonEmpty(
        // Ordered most to least human: a real name beats a handle, and a handle
        // beats nothing.
        ['full_name', 'name', 'preferred_username', 'user_name', 'nickname'],
      ),
      avatarUrl: firstNonEmpty(['avatar_url', 'picture']),
      provider: AuthProviderKind.fromId(
        user.appMetadata['provider'] as String?,
      ),
    );
  }

  final String id;
  final String? email;
  final String? displayName;
  final String? avatarUrl;
  final AuthProviderKind? provider;

  /// Best available label for this account. Falls back through the email local
  /// part to a generic string, because Apple's Hide My Email accounts can carry
  /// no name at all.
  String get label {
    final name = displayName;
    if (name != null && name.isNotEmpty) return name;
    final address = email;
    if (address != null && address.contains('@')) {
      return address.split('@').first;
    }
    return 'Signed in';
  }

  /// One or two letters for an avatar placeholder.
  String get initials {
    final source = label.trim();
    if (source.isEmpty) return '?';
    final words = source.split(RegExp(r'\s+')).where((w) => w.isNotEmpty);
    if (words.length >= 2) {
      return '${words.first[0]}${words.elementAt(1)[0]}'.toUpperCase();
    }
    return source[0].toUpperCase();
  }

  @override
  bool operator ==(Object other) =>
      other is Account &&
      other.id == id &&
      other.email == email &&
      other.displayName == displayName &&
      other.avatarUrl == avatarUrl &&
      other.provider == provider;

  @override
  int get hashCode => Object.hash(id, email, displayName, avatarUrl, provider);
}

/// Result of a sign-in attempt.
///
/// Cancellation is the most common outcome of any sign-in sheet, and it is not
/// an error. Making it a distinct case stops the UI showing "sign in failed"
/// to someone who simply changed their mind.
sealed class SignInOutcome {
  const SignInOutcome();
}

/// Credentials accepted. The session arrives through the auth state stream
/// rather than on this result, so there is one path that updates the app.
final class SignInSucceeded extends SignInOutcome {
  const SignInSucceeded();
}

/// The browser or system sheet was opened and the rest happens out of band.
/// Used by the redirect-based providers, where success only shows up later as
/// an auth state change.
final class SignInPending extends SignInOutcome {
  const SignInPending();
}

final class SignInCancelled extends SignInOutcome {
  const SignInCancelled();
}

final class SignInFailed extends SignInOutcome {
  const SignInFailed(this.message);

  /// Message safe to show to the customer.
  final String message;
}
