import 'package:fabtrades/core/models/account.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Builds a Supabase [User] shaped the way a real provider callback arrives.
User _user({
  String? email,
  Map<String, dynamic> userMetadata = const {},
  String? provider,
}) {
  return User(
    id: '9f1c0b62-0000-4000-8000-000000000001',
    appMetadata: {'provider': ?provider},
    userMetadata: userMetadata,
    aud: 'authenticated',
    email: email,
    createdAt: '2026-07-01T00:00:00Z',
  );
}

void main() {
  group('Account.fromUser', () {
    test('prefers a real name over a handle', () {
      final account = _user(
        userMetadata: const {
          'full_name': 'Rhinar Hothead',
          'preferred_username': 'rhinar_smash',
        },
      );

      expect(Account.fromUser(account).displayName, 'Rhinar Hothead');
    });

    test('falls back through the name keys each provider actually sends', () {
      // Google sends `name`, Discord sends `full_name` plus `user_name`.
      expect(
        Account.fromUser(_user(userMetadata: const {'name': 'Dorinthea'}))
            .displayName,
        'Dorinthea',
      );
      expect(
        Account.fromUser(_user(userMetadata: const {'user_name': 'briar'}))
            .displayName,
        'briar',
      );
    });

    test('ignores blank metadata rather than showing whitespace', () {
      final account = Account.fromUser(
        _user(userMetadata: const {'full_name': '   ', 'name': 'Kano'}),
      );

      expect(account.displayName, 'Kano');
    });

    test('reads the avatar from either key', () {
      expect(
        Account.fromUser(
          _user(userMetadata: const {'picture': 'https://x.test/a.png'}),
        ).avatarUrl,
        'https://x.test/a.png',
      );
    });

    test('maps the provider id onto a known kind', () {
      expect(
        Account.fromUser(_user(provider: 'discord')).provider,
        AuthProviderKind.discord,
      );
      // An unrecognised provider is not an error; the UI just omits it.
      expect(Account.fromUser(_user(provider: 'twitter')).provider, isNull);
      expect(Account.fromUser(_user()).provider, isNull);
    });
  });

  group('Account.label', () {
    test('uses the email local part when no name was shared', () {
      expect(_account(email: 'bravo@example.com').label, 'bravo');
    });

    test('degrades gracefully for a Hide My Email account with no name', () {
      // Apple can supply neither, and "Signed in" beats an empty tile.
      expect(_account().label, 'Signed in');
    });
  });

  group('Account.initials', () {
    test('takes one letter from each of the first two words', () {
      expect(_account(displayName: 'Rhinar Hothead').initials, 'RH');
    });

    test('takes a single letter from a one-word name', () {
      expect(_account(displayName: 'briar').initials, 'B');
    });

    test('collapses runs of whitespace', () {
      expect(_account(displayName: 'Ira   Crimson').initials, 'IC');
    });
  });
}

Account _account({String? email, String? displayName}) => Account(
      id: '9f1c0b62-0000-4000-8000-000000000001',
      email: email,
      displayName: displayName,
    );
