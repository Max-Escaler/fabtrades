import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:fabtrades/core/data/card_repository.dart';
import 'package:fabtrades/core/models/account.dart';
import 'package:fabtrades/core/models/card_model.dart';
import 'package:fabtrades/core/providers.dart';
import 'package:fabtrades/features/onboarding/onboarding_keys.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:showcaseview/showcaseview.dart';

import 'sync_stub.dart';

class MockCardRepository extends Mock implements CardRepository {}

/// Pumps [child] inside a [MaterialApp] with a real (mock-backed) provider
/// scope so widgets that read providers work without touching Supabase.
///
/// The card catalog is served from [catalog] via a mocked [CardRepository];
/// SharedPreferences is initialized empty (or from [seed]).
///
/// Signed out by default. Pass [account] to render the signed-in variants;
/// either way [accountProvider] is overridden so nothing reaches Supabase Auth,
/// whose client does not exist under `flutter test`.
///
/// Also registers the home [ShowcaseView] scope so screens that wrap widgets in
/// coach marks can build outside [HomeShell].
Future<ProviderContainer> pumpApp(
  WidgetTester tester,
  Widget child, {
  List<CardModel> catalog = const [],
  Map<String, Object> seed = const {},
  Account? account,
}) async {
  SharedPreferences.setMockInitialValues(seed);
  final prefs = await SharedPreferences.getInstance();

  final mockRepo = MockCardRepository();
  when(() => mockRepo.fetchAll()).thenAnswer((_) async => catalog);

  final container = ProviderContainer(
    overrides: [
      sharedPreferencesProvider.overrideWithValue(prefs),
      cardRepositoryProvider.overrideWithValue(mockRepo),
      accountProvider.overrideWith((ref) => Stream.value(account)),
      syncProvider.overrideWith(StubSyncNotifier.new),
    ],
  );
  addTearDown(container.dispose);

  ShowcaseView.register(scope: OnboardingKeys.homeScope, enableShowcase: false);
  addTearDown(() {
    try {
      ShowcaseView.getNamed(OnboardingKeys.homeScope).unregister();
    } catch (_) {}
  });

  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: container,
      child: MaterialApp(home: child),
    ),
  );
  return container;
}
