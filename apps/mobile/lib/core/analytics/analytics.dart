import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:posthog_flutter/posthog_flutter.dart';

import '../config/posthog_config.dart';

final analyticsProvider = Provider<Analytics>((ref) => Analytics());

/// Thin wrapper around PostHog. Feature code calls this — never `Posthog()`
/// directly — so a missing key is a silent no-op and analytics never throws
/// into UI paths.
class Analytics {
  bool get _enabled => PostHogEnv.isConfigured;

  void capture(String event, [Map<String, Object>? properties]) {
    if (!_enabled) return;
    Posthog()
        .capture(eventName: event, properties: properties)
        .catchError((Object e) => debugPrint('analytics: $e'));
  }

  void screen(String name, [Map<String, Object>? properties]) {
    if (!_enabled) return;
    Posthog()
        .screen(screenName: name, properties: properties)
        .catchError((Object e) => debugPrint('analytics: $e'));
  }

  Future<void> identify({
    required String userId,
    Map<String, Object>? userProperties,
  }) async {
    if (!_enabled) return;
    try {
      await Posthog().identify(
        userId: userId,
        userProperties: userProperties,
      );
    } catch (e) {
      debugPrint('analytics identify: $e');
    }
  }

  Future<void> reset() async {
    if (!_enabled) return;
    try {
      await Posthog().reset();
    } catch (e) {
      debugPrint('analytics reset: $e');
    }
  }

  Future<void> register(String key, Object value) async {
    if (!_enabled) return;
    try {
      await Posthog().register(key, value);
    } catch (e) {
      debugPrint('analytics register: $e');
    }
  }

  void captureException(
    Object error,
    StackTrace stack, [
    Map<String, Object>? properties,
  ]) {
    if (!_enabled) return;
    Posthog()
        .captureException(
          error: error,
          stackTrace: stack,
          properties: properties,
        )
        .catchError((Object e) => debugPrint('analytics exception: $e'));
  }
}
