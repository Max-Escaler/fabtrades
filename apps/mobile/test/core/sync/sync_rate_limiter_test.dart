import 'package:fabtrades/core/sync/sync_rate_limiter.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('SyncRateLimiter', () {
    test('allows first mutation and pull immediately', () {
      final clock = _Clock(DateTime(2026, 8, 2, 12));
      final gate = SyncRateLimiter(clock: clock.now);

      expect(gate.mutationWait(), Duration.zero);
      expect(gate.pullWait(), Duration.zero);
    });

    test('enforces mutation cooldown', () {
      final clock = _Clock(DateTime(2026, 8, 2, 12));
      final gate = SyncRateLimiter(clock: clock.now);

      gate.markMutation();
      expect(gate.mutationWait(), SyncRateLimiter.mutationCooldown);

      clock.advance(const Duration(seconds: 1));
      expect(gate.mutationWait(), const Duration(seconds: 2));

      clock.advance(const Duration(seconds: 2));
      expect(gate.mutationWait(), Duration.zero);
    });

    test('enforces pull cooldown independently of mutation', () {
      final clock = _Clock(DateTime(2026, 8, 2, 12));
      final gate = SyncRateLimiter(clock: clock.now);

      gate.markMutation();
      expect(gate.pullWait(), Duration.zero);

      gate.markPull();
      expect(gate.pullWait(), SyncRateLimiter.pullCooldown);
      expect(gate.mutationWait(), SyncRateLimiter.mutationCooldown);

      clock.advance(SyncRateLimiter.mutationCooldown);
      expect(gate.mutationWait(), Duration.zero);
      expect(gate.pullWait() > Duration.zero, isTrue);
    });

    test('markAll quiets both opportunistic paths', () {
      final clock = _Clock(DateTime(2026, 8, 2, 12));
      final gate = SyncRateLimiter(clock: clock.now);

      gate.markAll();
      expect(gate.mutationWait(), SyncRateLimiter.mutationCooldown);
      expect(gate.pullWait(), SyncRateLimiter.pullCooldown);
    });
  });
}

class _Clock {
  _Clock(this._now);
  DateTime _now;

  DateTime now() => _now;

  void advance(Duration by) => _now = _now.add(by);
}
