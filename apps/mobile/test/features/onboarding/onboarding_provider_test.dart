import 'package:fabtrades/core/providers.dart';
import 'package:fabtrades/features/onboarding/onboarding_provider.dart';
import 'package:fabtrades/features/onboarding/onboarding_repository.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  Future<ProviderContainer> container() async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final c = ProviderContainer(
      overrides: [sharedPreferencesProvider.overrideWithValue(prefs)],
    );
    addTearDown(c.dispose);
    return c;
  }

  test('markSeen persists and is idempotent', () async {
    final c = await container();
    expect(c.read(onboardingProvider), isEmpty);

    await c.read(onboardingProvider.notifier).markSeen(OnboardingTourId.trade);
    expect(c.read(onboardingProvider), contains(OnboardingTourId.trade));

    await c.read(onboardingProvider.notifier).markSeen(OnboardingTourId.trade);
    expect(c.read(onboardingProvider), {OnboardingTourId.trade});
  });

  test('markAllSeen covers every tour id', () async {
    final c = await container();
    await c.read(onboardingProvider.notifier).markAllSeen();
    expect(c.read(onboardingProvider), OnboardingTourId.all);
  });

  test('resetAll clears every flag', () async {
    final c = await container();
    await c.read(onboardingProvider.notifier).markAllSeen();
    await c.read(onboardingProvider.notifier).resetAll();
    expect(c.read(onboardingProvider), isEmpty);
  });
}
