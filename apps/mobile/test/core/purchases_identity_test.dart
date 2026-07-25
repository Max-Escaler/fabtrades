import 'package:fabtrades/core/data/purchases_repository.dart';
import 'package:fabtrades/core/models/account.dart';
import 'package:fabtrades/core/providers.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:purchases_flutter/purchases_flutter.dart';

/// Records identity calls instead of making them. The real repository talks to
/// method channels that do not exist under `flutter test`.
class _RecordingPurchases extends PurchasesRepository {
  _RecordingPurchases({this.configured = true});

  final bool configured;
  final calls = <String>[];

  @override
  bool get isConfigured => configured;

  @override
  Future<CustomerInfo?> logIn(String userId) async {
    calls.add('logIn:$userId');
    // Null keeps this test about the binding. A real logIn returns customer info,
    // which the notifier adopts; that path is covered by the entitlement tests.
    return null;
  }

  @override
  Future<CustomerInfo?> logOut() async {
    calls.add('logOut');
    return null;
  }

  @override
  Future<CustomerInfo?> customerInfo() async => null;
}

const _account = Account(
  id: '9f1c0b62-0000-4000-8000-000000000001',
  email: 'trader@example.test',
);

const _other = Account(
  id: '9f1c0b62-0000-4000-8000-000000000002',
  email: 'someone.else@example.test',
);

/// Builds a container whose account stream is driven by [accounts].
ProviderContainer _container(
  _RecordingPurchases purchases,
  Stream<Account?> accounts,
) {
  final container = ProviderContainer(
    overrides: [
      purchasesRepositoryProvider.overrideWithValue(purchases),
      accountProvider.overrideWith((ref) => accounts),
    ],
  );
  addTearDown(container.dispose);
  return container;
}

void main() {
  group('purchasesIdentityProvider', () {
    test('binds RevenueCat to the signed-in user', () async {
      final purchases = _RecordingPurchases();
      final container = _container(purchases, Stream.value(_account));

      // Nothing reads this for behaviour, so it has to be watched to build at
      // all — which is why `SyncHost` watches it above the tabs.
      container.listen(purchasesIdentityProvider, (_, _) {});
      await container.read(accountProvider.future);
      await Future<void>.delayed(Duration.zero);

      expect(purchases.calls, ['logIn:${_account.id}']);
      expect(container.read(purchasesIdentityProvider), _account.id);
    });

    test('returns to an anonymous id when signed out', () async {
      final purchases = _RecordingPurchases();
      final container = _container(purchases, Stream.value(null));

      container.listen(purchasesIdentityProvider, (_, _) {});
      await container.read(accountProvider.future);
      await Future<void>.delayed(Duration.zero);

      // Leaving the previous user's id in place would attribute the next
      // account's purchases to them.
      expect(purchases.calls, ['logOut']);
      expect(container.read(purchasesIdentityProvider), isNull);
    });

    test('rebinds when the account changes', () async {
      final purchases = _RecordingPurchases();
      final accounts = Stream.fromIterable([_account, null, _other]);
      final container = _container(purchases, accounts);

      container.listen(purchasesIdentityProvider, (_, _) {});
      // Let every event through the stream and its microtask land.
      for (var i = 0; i < 6; i++) {
        await Future<void>.delayed(Duration.zero);
      }

      expect(purchases.calls, [
        'logIn:${_account.id}',
        'logOut',
        'logIn:${_other.id}',
      ]);
    });

    test('leaves the binding alone while the session is still resolving',
        () async {
      final purchases = _RecordingPurchases();
      // Supabase restores a stored session asynchronously, so this is every app
      // launch for a signed-in customer.
      final accounts = Stream.fromFuture(
        Future.delayed(const Duration(milliseconds: 50), () => _account),
      );
      final container = _container(purchases, accounts);

      container.listen(purchasesIdentityProvider, (_, _) {});
      await Future<void>.delayed(Duration.zero);

      // An unresolved stream is not "signed out". Treating it as such would log
      // out of the real identity on every launch.
      expect(purchases.calls, isEmpty);

      await container.read(accountProvider.future);
      await Future<void>.delayed(Duration.zero);

      expect(purchases.calls, ['logIn:${_account.id}']);
    });

    test('leaves the binding alone when auth itself fails', () async {
      final purchases = _RecordingPurchases();
      final container = _container(
        purchases,
        Stream<Account?>.error(StateError('auth is unreachable')),
      );

      container.listen(purchasesIdentityProvider, (_, _) {});
      await Future<void>.delayed(Duration.zero);

      // Unbinding on an error would turn a transient auth failure into a
      // purchase attributed to nobody.
      expect(purchases.calls, isEmpty);
    });

    test('does nothing on a build with no RevenueCat key', () async {
      final purchases = _RecordingPurchases(configured: false);
      final container = _container(purchases, Stream.value(_account));

      container.listen(purchasesIdentityProvider, (_, _) {});
      await container.read(accountProvider.future);
      await Future<void>.delayed(Duration.zero);

      // No SDK to bind an identity to, and calling into it would throw.
      expect(purchases.calls, isEmpty);
      expect(container.read(purchasesIdentityProvider), isNull);
    });
  });
}
