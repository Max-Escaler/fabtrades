import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:fabtrades/core/data/card_repository.dart';
import 'package:fabtrades/core/models/card_model.dart';
import 'package:fabtrades/core/providers.dart';
import 'package:shared_preferences/shared_preferences.dart';

class MockCardRepository extends Mock implements CardRepository {}

/// Pumps [child] inside a [MaterialApp] with a real (mock-backed) provider
/// scope so widgets that read providers work without touching Supabase.
///
/// The card catalog is served from [catalog] via a mocked [CardRepository];
/// SharedPreferences is initialized empty (or from [seed]).
Future<ProviderContainer> pumpApp(
  WidgetTester tester,
  Widget child, {
  List<CardModel> catalog = const [],
  Map<String, Object> seed = const {},
}) async {
  SharedPreferences.setMockInitialValues(seed);
  final prefs = await SharedPreferences.getInstance();

  final mockRepo = MockCardRepository();
  when(() => mockRepo.fetchAll()).thenAnswer((_) async => catalog);

  final container = ProviderContainer(
    overrides: [
      sharedPreferencesProvider.overrideWithValue(prefs),
      cardRepositoryProvider.overrideWithValue(mockRepo),
    ],
  );
  addTearDown(container.dispose);

  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: container,
      child: MaterialApp(home: child),
    ),
  );
  return container;
}
