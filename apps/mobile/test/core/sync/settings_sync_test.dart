import 'package:fabtrades/core/data/settings_repository.dart';
import 'package:fabtrades/core/models/app_settings.dart';
import 'package:fabtrades/core/sync/remote_store.dart';
import 'package:fabtrades/core/sync/settings_sync.dart';
import 'package:fabtrades/core/sync/sync_journal.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

const _userId = '9f1c0b62-0000-4000-8000-000000000001';

class FakeRemoteSettings implements RemoteSettings {
  FakeRemoteSettings([this.row]);

  Map<String, dynamic>? row;
  int upsertCalls = 0;
  bool failOnRead = false;

  @override
  Future<Map<String, dynamic>?> fetch(String userId) async {
    if (failOnRead) throw Exception('unreachable');
    return row;
  }

  @override
  Future<void> upsert({
    required String userId,
    required String priceSource,
    required String themeMode,
    required DateTime updatedAt,
  }) async {
    upsertCalls++;
    row = {
      'user_id': userId,
      'price_source': priceSource,
      'theme_mode': themeMode,
      'updated_at': updatedAt.toIso8601String(),
    };
  }
}

Map<String, dynamic> remoteSettings({
  String priceSource = 'tcgplayer',
  String themeMode = 'dark',
  required DateTime updatedAt,
}) {
  return {
    'user_id': _userId,
    'price_source': priceSource,
    'theme_mode': themeMode,
    'updated_at': updatedAt.toIso8601String(),
  };
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late SyncJournal journal;
  late SettingsRepository repository;

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    journal = SyncJournal(prefs);
    repository = SettingsRepository(prefs, journal);
  });

  SettingsSync syncWith(FakeRemoteSettings remote) => SettingsSync(
        repository: repository,
        remote: remote,
        journal: journal,
      );

  test('an untouched device does not push its defaults', () async {
    // The failure this prevents: a fresh install overwriting a real preference set
    // on another device, purely because it also holds a value for that setting.
    final remote = FakeRemoteSettings();

    final changed = await syncWith(remote).run(userId: _userId);

    expect(changed, isFalse);
    expect(remote.upsertCalls, 0);
    expect(remote.row, isNull);
  });

  test('a choice made here is uploaded', () async {
    await repository.save(const AppSettings(source: PriceSource.cardmarket));
    final remote = FakeRemoteSettings();

    await syncWith(remote).run(userId: _userId);

    expect(remote.row!['price_source'], 'cardmarket');
    expect(remote.row!['theme_mode'], 'dark');
  });

  test('a remote choice reaches a device that has expressed none', () async {
    final remote = FakeRemoteSettings(
      remoteSettings(
        priceSource: 'cardmarket',
        themeMode: 'light',
        updatedAt: DateTime.utc(2026, 6, 1),
      ),
    );

    final changed = await syncWith(remote).run(userId: _userId);

    expect(changed, isTrue);
    expect(repository.load().source, PriceSource.cardmarket);
    expect(repository.load().themeMode, AppThemeMode.light);
  });

  test('the newer choice wins in either direction', () async {
    await repository.save(const AppSettings(source: PriceSource.cardmarket));

    final stale = FakeRemoteSettings(
      remoteSettings(priceSource: 'tcgplayer', updatedAt: DateTime.utc(2020)),
    );
    await syncWith(stale).run(userId: _userId);
    expect(repository.load().source, PriceSource.cardmarket);
    expect(stale.row!['price_source'], 'cardmarket');

    final fresh = FakeRemoteSettings(
      remoteSettings(priceSource: 'tcgplayer', updatedAt: DateTime.utc(2030)),
    );
    await syncWith(fresh).run(userId: _userId);
    expect(repository.load().source, PriceSource.tcgplayer);
  });

  test('an unrecognised stored value falls back instead of failing', () async {
    // A newer client could add a price source this build has never heard of.
    final remote = FakeRemoteSettings(
      remoteSettings(
        priceSource: 'some_future_marketplace',
        updatedAt: DateTime.utc(2030),
      ),
    );

    await syncWith(remote).run(userId: _userId);

    expect(repository.load().source, PriceSource.tcgplayer);
  });

  test('a settled preference is not rewritten on every sync', () async {
    await repository.save(const AppSettings(source: PriceSource.cardmarket));
    final remote = FakeRemoteSettings();
    await syncWith(remote).run(userId: _userId);
    expect(remote.upsertCalls, 1);

    await syncWith(remote).run(userId: _userId);

    expect(remote.upsertCalls, 1);
  });

  test('reports no change when the remote value already matches', () async {
    await repository.save(const AppSettings(source: PriceSource.cardmarket));
    final remote = FakeRemoteSettings(
      remoteSettings(priceSource: 'cardmarket', updatedAt: DateTime.utc(2030)),
    );

    expect(await syncWith(remote).run(userId: _userId), isFalse);
  });
}
