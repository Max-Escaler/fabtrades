import 'package:fabtrades/core/sync/sync_journal.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late SyncJournal journal;

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    journal = SyncJournal(await SharedPreferences.getInstance());
  });

  Future<void> write({
    Map<String, String> before = const {},
    Map<String, String> after = const {},
    DateTime? at,
  }) {
    return journal.noteLocalWrite(
      SyncDomain.binder,
      before: before,
      after: after,
      at: at,
    );
  }

  group('local stamps', () {
    test('orders two edits made in the same millisecond', () async {
      final sameInstant = DateTime.utc(2026, 5, 1, 12);
      await write(after: {'a': 'v1'}, at: sameInstant);
      final first = journal.localTimestamps(SyncDomain.binder)['a']!;

      await write(before: {'a': 'v1'}, after: {'a': 'v2'}, at: sameInstant);
      final second = journal.localTimestamps(SyncDomain.binder)['a']!;

      // Equal timestamps would make last-write-wins unable to pick a winner.
      expect(second.isAfter(first), isTrue);
    });

    test('stamps only what actually changed', () async {
      final at = DateTime.utc(2026, 5, 1, 12);
      await write(after: {'a': 'v1', 'b': 'v1'}, at: at);
      final before = journal.localTimestamps(SyncDomain.binder);

      await write(
        before: {'a': 'v1', 'b': 'v1'},
        after: {'a': 'v2', 'b': 'v1'},
        at: at.add(const Duration(minutes: 1)),
      );
      final after = journal.localTimestamps(SyncDomain.binder);

      expect(after['a']!.isAfter(before['a']!), isTrue);
      expect(after['b'], before['b'],
          reason: 'restamping untouched records would make this device '
              'always win the next merge');
    });

    test('records a removal as a tombstone', () async {
      await write(after: {'a': 'v1'});
      await write(before: {'a': 'v1'}, after: const {});

      expect(journal.localTimestamps(SyncDomain.binder), isEmpty);
      expect(journal.tombstones(SyncDomain.binder).keys, ['a']);
    });

    test('keeps domains apart', () async {
      await write(after: {'a': 'v1'});

      expect(journal.localTimestamps(SyncDomain.trades), isEmpty);
      expect(journal.highWaterMark(SyncDomain.trades), isNull);
    });
  });

  group('syncStart', () {
    test('is now when nothing has been written', () {
      final before = DateTime.now().toUtc();
      final start = journal.syncStart(SyncDomain.binder);

      expect(start.isBefore(before), isFalse);
    });

    test('never precedes a stamp the clock has not reached yet', () async {
      // What ordering two same-millisecond edits produces: a stamp slightly in the
      // future. A sync using the wall clock would treat it as concurrent with
      // itself and protect it from reconciliation forever.
      final ahead = DateTime.now().toUtc().add(const Duration(seconds: 30));
      await write(after: {'a': 'v1'}, at: ahead);

      expect(journal.syncStart(SyncDomain.binder).isBefore(ahead), isFalse);
    });

    test('is now once the clock has caught up', () async {
      await write(after: {'a': 'v1'}, at: DateTime.utc(2026, 1, 1));

      final start = journal.syncStart(SyncDomain.binder);
      expect(start.year, DateTime.now().toUtc().year);
    });
  });

  group('account provenance', () {
    test('starts unclaimed, so local data is nobody-in-particular\'s', () {
      expect(journal.syncedUserId, isNull);
    });

    test('remembers the account the cache belongs to', () async {
      await journal.setSyncedUserId('user-1');
      expect(journal.syncedUserId, 'user-1');
    });

    test('clear forgets provenance as well as timestamps', () async {
      await write(after: {'a': 'v1'});
      await journal.setSyncedUserId('user-1');

      await journal.clear();

      expect(journal.syncedUserId, isNull);
      expect(journal.localTimestamps(SyncDomain.binder), isEmpty);
    });
  });

  group('replaceRecords', () {
    test('keeps an edit made while the sync was in flight', () async {
      final syncStartedAt = DateTime.utc(2026, 5, 1, 12);
      await write(
        after: {'a': 'v1'},
        at: syncStartedAt.add(const Duration(seconds: 1)),
      );

      await journal.replaceRecords(
        SyncDomain.binder,
        live: {'b': DateTime.utc(2026, 4, 1)},
        preserveAfter: syncStartedAt,
      );

      final records = journal.localTimestamps(SyncDomain.binder);
      expect(records.keys, unorderedEquals(['a', 'b']));
    });

    test('drops what the sync already accounted for', () async {
      await write(after: {'a': 'v1'}, at: DateTime.utc(2026, 4, 1));

      await journal.replaceRecords(
        SyncDomain.binder,
        live: const {},
        preserveAfter: DateTime.utc(2026, 5, 1),
      );

      expect(journal.localTimestamps(SyncDomain.binder), isEmpty);
    });

    test('advances the high-water mark to what the sync observed', () async {
      final observed = DateTime.utc(2027, 1, 1);
      await journal.replaceRecords(
        SyncDomain.binder,
        live: const {},
        preserveAfter: DateTime.utc(2026, 5, 1),
        observed: observed,
      );

      expect(journal.highWaterMark(SyncDomain.binder), observed);
    });

    test('never moves the high-water mark backwards', () async {
      final ahead = DateTime.utc(2027, 1, 1);
      await write(after: {'a': 'v1'}, at: ahead);

      await journal.replaceRecords(
        SyncDomain.binder,
        live: const {},
        preserveAfter: ahead,
        observed: DateTime.utc(2026, 1, 1),
      );

      expect(journal.highWaterMark(SyncDomain.binder), ahead);
    });
  });

  test('a corrupt journal reads as empty rather than throwing', () async {
    SharedPreferences.setMockInitialValues({'sync_journal_v1': 'not json'});
    final broken = SyncJournal(await SharedPreferences.getInstance());

    // Costs a re-upload, which merges; throwing here would break every screen.
    expect(broken.localTimestamps(SyncDomain.binder), isEmpty);
    expect(broken.syncedUserId, isNull);
  });
}
