import 'package:fabtrades/core/config/revenuecat_config.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('recognises monthly product ids across stores', () {
    expect(RevenueCatConfig.isMonthlyProduct('monthly'), isTrue);
    expect(
      RevenueCatConfig.isMonthlyProduct('com.fabtrades.app.pro.monthly'),
      isTrue,
    );
    expect(RevenueCatConfig.isMonthlyProduct('pro_monthly:default'), isTrue);
    expect(RevenueCatConfig.isMonthlyProduct('yearly'), isFalse);
    expect(RevenueCatConfig.isMonthlyProduct(null), isFalse);
  });

  test('recognises yearly product ids across stores', () {
    expect(RevenueCatConfig.isYearlyProduct('yearly'), isTrue);
    expect(
      RevenueCatConfig.isYearlyProduct('com.fabtrades.app.pro.yearly'),
      isTrue,
    );
    expect(RevenueCatConfig.isYearlyProduct('pro_yearly:default'), isTrue);
    expect(RevenueCatConfig.isYearlyProduct('monthly'), isFalse);
  });
}
