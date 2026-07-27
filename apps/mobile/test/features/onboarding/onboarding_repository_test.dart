import 'package:fabtrades/features/onboarding/onboarding_repository.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  Future<OnboardingRepository> repo([Map<String, Object> seed = const {}]) async {
    SharedPreferences.setMockInitialValues(seed);
    return OnboardingRepository(await SharedPreferences.getInstance());
  }

  test('returns empty when nothing stored', () async {
    expect((await repo()).load(), isEmpty);
  });

  test('save then load round-trips tour ids', () async {
    final r = await repo();
    await r.save({OnboardingTourId.welcome, OnboardingTourId.trade});

    final loaded = r.load();
    expect(loaded, containsAll([OnboardingTourId.welcome, OnboardingTourId.trade]));
    expect(loaded.length, 2);
  });

  test('returns empty on corrupt json', () async {
    final r = await repo({OnboardingRepository.storageKey: 'not json'});
    expect(r.load(), isEmpty);
  });
}
