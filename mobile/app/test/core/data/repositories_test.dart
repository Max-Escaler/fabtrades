import 'package:flutter_test/flutter_test.dart';
import 'package:fabtrades/core/data/catalog_repository.dart';
import 'package:fabtrades/core/data/collection_repository.dart';
import 'package:fabtrades/core/data/lend_repository.dart';
import 'package:fabtrades/core/data/settings_repository.dart';
import 'package:fabtrades/core/data/trade_repository.dart';
import 'package:fabtrades/core/models/app_settings.dart';
import 'package:fabtrades/core/models/collection_entry.dart';
import 'package:fabtrades/core/models/lend_group.dart';
import 'package:fabtrades/core/models/trade.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../support/fixtures.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  Future<SharedPreferences> freshPrefs([Map<String, Object> seed = const {}]) {
    SharedPreferences.setMockInitialValues(seed);
    return SharedPreferences.getInstance();
  }

  group('CollectionRepository', () {
    test('returns empty when nothing stored', () async {
      final repo = CollectionRepository(await freshPrefs());
      expect(repo.load(), isEmpty);
    });

    test('save then load round-trips entries', () async {
      final repo = CollectionRepository(await freshPrefs());
      final entries = [
        CollectionEntry(
          card: buildCard(id: 'c1', name: 'Vex'),
          quantity: 2,
          condition: 'LP',
          isWanted: true,
          addedAt: DateTime.utc(2026, 1, 1),
        ),
      ];
      await repo.save(entries);

      final loaded = repo.load();
      expect(loaded.single.card.id, 'c1');
      expect(loaded.single.quantity, 2);
      expect(loaded.single.condition, 'LP');
      expect(loaded.single.isWanted, isTrue);
    });

    test('returns empty on corrupt json', () async {
      final repo = CollectionRepository(
          await freshPrefs({'collection_entries': 'not json'}));
      expect(repo.load(), isEmpty);
    });
  });

  group('TradeRepository', () {
    test('save then load round-trips trades', () async {
      final repo = TradeRepository(await freshPrefs());
      final trade = Trade(
        id: 't1',
        createdAt: DateTime.utc(2026, 2, 2),
        haveItems: [
          TradeItem(card: buildCard(id: 'h'), quantity: 1, priceEach: 3),
        ],
      );
      await repo.save([trade]);

      final loaded = repo.load();
      expect(loaded.single.id, 't1');
      expect(loaded.single.haveItems.single.card.id, 'h');
    });

    test('returns empty on corrupt json', () async {
      final repo =
          TradeRepository(await freshPrefs({'saved_trades': '{bad'}));
      expect(repo.load(), isEmpty);
    });
  });

  group('LendRepository', () {
    test('save then load round-trips groups', () async {
      final repo = LendRepository(await freshPrefs());
      final group = LendGroup(
        id: 'g1',
        personName: 'Sam',
        createdAt: DateTime.utc(2026, 3, 3),
        items: [LendItem(card: buildCard(id: 'x'), quantity: 2)],
      );
      await repo.save([group]);

      final loaded = repo.load();
      expect(loaded.single.id, 'g1');
      expect(loaded.single.personName, 'Sam');
      expect(loaded.single.cardCount, 2);
    });

    test('returns empty on corrupt json', () async {
      final repo = LendRepository(await freshPrefs({'lend_groups': 'x'}));
      expect(repo.load(), isEmpty);
    });
  });

  group('SettingsRepository', () {
    test('defaults when nothing stored', () async {
      final repo = SettingsRepository(await freshPrefs());
      final s = repo.load();
      expect(s.source, PriceSource.tcgplayer);
      expect(s.themeMode, AppThemeMode.light);
    });

    test('save then load round-trips settings', () async {
      final repo = SettingsRepository(await freshPrefs());
      await repo.save(const AppSettings(
        source: PriceSource.cardmarket,
        themeMode: AppThemeMode.dark,
      ));
      final s = repo.load();
      expect(s.source, PriceSource.cardmarket);
      expect(s.themeMode, AppThemeMode.dark);
    });

    test('defaults on corrupt json', () async {
      final repo =
          SettingsRepository(await freshPrefs({'app_settings': 'nope'}));
      expect(repo.load().source, PriceSource.tcgplayer);
    });
  });

  group('CatalogRepository', () {
    test('load returns null when empty', () async {
      final repo = CatalogRepository(await freshPrefs());
      expect(repo.load(), isNull);
      expect(repo.lastUpdated(), isNull);
    });

    test('save then load round-trips the catalog and stamps updated time',
        () async {
      final repo = CatalogRepository(await freshPrefs());
      await repo.save([buildCard(id: 'a'), buildCard(id: 'b')]);

      final loaded = repo.load();
      expect(loaded, isNotNull);
      expect(loaded!.map((c) => c.id), ['a', 'b']);
      expect(repo.lastUpdated(), isA<DateTime>());
    });

    test('load returns null on corrupt json', () async {
      final repo = CatalogRepository(await freshPrefs({'card_catalog': '!!'}));
      expect(repo.load(), isNull);
    });
  });
}
