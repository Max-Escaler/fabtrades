import 'package:fabtrades/core/models/app_update_config.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('fromMap parses config row', () {
    final config = AppUpdateConfig.fromMap({
      'latest_version': '1.0.2',
      'min_version': null,
      'android_store_url': 'https://play.google.com/store/apps/details?id=fabtrades.myapp',
      'ios_store_url': null,
      'message': 'Please update',
    });
    expect(config.isValid, isTrue);
    expect(config.latestVersion, '1.0.2');
    expect(config.message, 'Please update');
    expect(config.androidStoreUrl, contains('fabtrades.myapp'));
  });

  test('empty latest_version is invalid', () {
    expect(AppUpdateConfig.fromMap({'latest_version': '  '}).isValid, isFalse);
  });
}
