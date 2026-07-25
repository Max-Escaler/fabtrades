import 'package:fabtrades/core/sync/sync_record.dart';
import 'package:flutter_test/flutter_test.dart';

SyncRecord<String> live(String id, String value, int minute) => SyncRecord(
      id: id,
      value: value,
      updatedAt: DateTime.utc(2026, 7, 1, 12, minute),
    );

SyncRecord<String> gone(String id, int minute) => SyncRecord<String>.deleted(
      id: id,
      updatedAt: DateTime.utc(2026, 7, 1, 12, minute),
    );

Map<String, MergedRecord<String>> merge(
  List<SyncRecord<String>> local,
  List<SyncRecord<String>> remote,
) {
  return {for (final m in mergeRecords(local, remote)) m.record.id: m};
}

void main() {
  test('keeps records that exist on only one side', () {
    final result = merge([live('a', 'local', 0)], [live('b', 'remote', 0)]);

    expect(result['a']!.record.value, 'local');
    expect(result['a']!.winner, SyncSide.local);
    expect(result['b']!.record.value, 'remote');
    expect(result['b']!.winner, SyncSide.remote);
  });

  test('the newer edit wins regardless of side', () {
    expect(
      merge([live('a', 'old', 0)], [live('a', 'new', 5)])['a']!.record.value,
      'new',
    );
    expect(
      merge([live('a', 'new', 5)], [live('a', 'old', 0)])['a']!.record.value,
      'new',
    );
  });

  test('a delete beats an older edit, and an edit beats an older delete', () {
    expect(merge([live('a', 'x', 0)], [gone('a', 5)])['a']!.record.isDeleted,
        isTrue);
    // Re-adding something after deleting it elsewhere must not be undone.
    expect(merge([live('a', 'x', 5)], [gone('a', 0)])['a']!.record.value, 'x');
  });

  test('a tombstone wins a tie, so nothing a customer deleted comes back', () {
    // Equal timestamps are only reachable by clock coincidence, but the rule has
    // to be deterministic or two devices push at each other indefinitely.
    expect(merge([live('a', 'x', 3)], [gone('a', 3)])['a']!.record.isDeleted,
        isTrue);
    expect(merge([gone('a', 3)], [live('a', 'x', 3)])['a']!.record.isDeleted,
        isTrue);
  });

  test('an otherwise tied record stays local, so a fresh edit is never lost', () {
    final result = merge([live('a', 'local', 3)], [live('a', 'remote', 3)]);
    expect(result['a']!.record.value, 'local');
    expect(result['a']!.winner, SyncSide.local);
  });

  test('merging is symmetric in outcome for the values it keeps', () {
    final local = [live('a', 'A1', 1), live('b', 'B2', 2), gone('c', 9)];
    final remote = [live('a', 'A9', 9), live('c', 'C1', 1), live('d', 'D1', 1)];

    final forward = merge(local, remote);
    final backward = merge(remote, local);

    for (final id in ['a', 'b', 'c', 'd']) {
      expect(forward[id]!.record.value, backward[id]!.record.value,
          reason: 'record $id disagreed depending on merge order');
    }
  });

  test('reports both sides so callers know what to push and what to write', () {
    final result = merge(
      [live('stale', 'old', 0), live('fresh', 'new', 9)],
      [live('stale', 'newer', 5), live('fresh', 'older', 1)],
    );

    expect(result['stale']!.winner, SyncSide.remote);
    expect(result['fresh']!.winner, SyncSide.local);
  });
}
