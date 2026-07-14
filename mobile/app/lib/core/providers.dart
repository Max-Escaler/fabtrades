import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'data/card_repository.dart';
import 'data/catalog_repository.dart';
import 'data/collection_repository.dart';
import 'data/lend_repository.dart';
import 'data/settings_repository.dart';
import 'data/trade_repository.dart';
import 'logic/pricing.dart';
import 'models/app_settings.dart';
import 'models/card_model.dart';
import 'models/collection_entry.dart';
import 'models/lend_group.dart';
import 'models/trade.dart';

/// Overridden in main() with the real instance.
final sharedPreferencesProvider = Provider<SharedPreferences>(
  (ref) => throw UnimplementedError('SharedPreferences not initialized'),
);

final supabaseClientProvider =
    Provider<SupabaseClient>((ref) => Supabase.instance.client);

final cardRepositoryProvider = Provider<CardRepository>(
    (ref) => CardRepository(ref.watch(supabaseClientProvider)));

// ---------------------------------------------------------------------------
// Card catalog (preloaded + cached locally for instant, offline browsing)
// ---------------------------------------------------------------------------
final catalogRepositoryProvider = Provider<CatalogRepository>(
    (ref) => CatalogRepository(ref.watch(sharedPreferencesProvider)));

/// Holds the whole card catalog. On startup it returns the locally cached
/// catalog immediately (no spinner) and refreshes prices from Supabase in the
/// background; if there is no cache yet it fetches once and stores it.
class CatalogNotifier extends AsyncNotifier<List<CardModel>> {
  @override
  Future<List<CardModel>> build() async {
    final store = ref.watch(catalogRepositoryProvider);
    final cached = store.load();
    if (cached != null && cached.isNotEmpty) {
      _refreshInBackground();
      return cached;
    }
    final cards = await ref.watch(cardRepositoryProvider).fetchAll();
    await store.save(cards);
    return cards;
  }

  Future<void> _refreshInBackground() async {
    try {
      final cards = await ref.read(cardRepositoryProvider).fetchAll();
      await ref.read(catalogRepositoryProvider).save(cards);
      state = AsyncData(cards);
    } catch (_) {
      // Keep serving the cached catalog if the refresh fails.
    }
  }

  /// Pull-to-refresh: re-fetch the catalog so the latest synced prices show.
  Future<void> refresh() async {
    final cards = await ref.read(cardRepositoryProvider).fetchAll();
    await ref.read(catalogRepositoryProvider).save(cards);
    state = AsyncData(cards);
  }
}

final catalogProvider =
    AsyncNotifierProvider<CatalogNotifier, List<CardModel>>(
        CatalogNotifier.new);

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------
final settingsRepositoryProvider = Provider<SettingsRepository>(
    (ref) => SettingsRepository(ref.watch(sharedPreferencesProvider)));

class SettingsNotifier extends Notifier<AppSettings> {
  @override
  AppSettings build() => ref.watch(settingsRepositoryProvider).load();

  void setSource(PriceSource source) {
    state = state.copyWith(source: source);
    ref.read(settingsRepositoryProvider).save(state);
  }

  void setType(PriceType type) {
    state = state.copyWith(type: type);
    ref.read(settingsRepositoryProvider).save(state);
  }
}

final settingsProvider =
    NotifierProvider<SettingsNotifier, AppSettings>(SettingsNotifier.new);

final pricingProvider =
    Provider<Pricing>((ref) => Pricing(ref.watch(settingsProvider)));

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------
final searchFiltersProvider =
    NotifierProvider<SearchFiltersNotifier, CardFilters>(
        SearchFiltersNotifier.new);

class SearchFiltersNotifier extends Notifier<CardFilters> {
  @override
  CardFilters build() => const CardFilters();

  void setQuery(String q) => state = state.copyWith(query: q);
  void setFoilOnly(bool v) => state = state.copyWith(foilOnly: v);
  void setSort(CardSort s) => state = state.copyWith(sort: s);

  /// Start browsing a set with a fresh set of filters.
  void enterSet(String setName) => state = CardFilters(setName: setName);

  void clear() => state = CardFilters(setName: state.setName);
}

/// Browse/search results derived by filtering the preloaded catalog in memory,
/// so entering a set is instant (no network round-trip).
final browseResultsProvider = Provider<AsyncValue<List<CardModel>>>((ref) {
  final catalog = ref.watch(catalogProvider);
  final filters = ref.watch(searchFiltersProvider);
  return catalog.whenData((cards) => filterCards(cards, filters));
});

/// Browse results collapsed into one entry per card name (all printings of a
/// card grouped together), for the grouped Browse view.
final browseGroupsProvider = Provider<AsyncValue<List<CardGroup>>>((ref) {
  final results = ref.watch(browseResultsProvider);
  final sort = ref.watch(searchFiltersProvider).sort;
  return results.whenData((cards) => groupCardsByName(cards, sort));
});

/// The most recent moment the pricing pipeline refreshed any card in the
/// catalog (max `price_updated_at`). Drives the "prices last updated" toast.
final priceUpdatedAtProvider = Provider<DateTime?>((ref) {
  return ref.watch(catalogProvider).maybeWhen(
        data: (cards) {
          DateTime? latest;
          for (final c in cards) {
            final t = c.priceUpdatedAt;
            if (t != null && (latest == null || t.isAfter(latest))) {
              latest = t;
            }
          }
          return latest;
        },
        orElse: () => null,
      );
});

// ---------------------------------------------------------------------------
// Collection & want lists
// ---------------------------------------------------------------------------
final collectionRepositoryProvider = Provider<CollectionRepository>(
    (ref) => CollectionRepository(ref.watch(sharedPreferencesProvider)));

class CollectionNotifier extends Notifier<List<CollectionEntry>> {
  @override
  List<CollectionEntry> build() =>
      ref.watch(collectionRepositoryProvider).load();

  void _persist() => ref.read(collectionRepositoryProvider).save(state);

  void add(CardModel card,
      {int quantity = 1, String condition = 'NM', bool isWanted = false}) {
    final idx = state.indexWhere(
        (e) => e.card.id == card.id && e.isWanted == isWanted);
    if (idx >= 0) {
      final existing = state[idx];
      final updated = [...state];
      updated[idx] = existing.copyWith(quantity: existing.quantity + quantity);
      state = updated;
    } else {
      state = [
        CollectionEntry(
          card: card,
          quantity: quantity,
          condition: condition,
          isWanted: isWanted,
          addedAt: DateTime.now(),
        ),
        ...state,
      ];
    }
    _persist();
  }

  void setQuantity(String cardId, bool isWanted, int quantity) {
    if (quantity <= 0) {
      remove(cardId, isWanted);
      return;
    }
    state = [
      for (final e in state)
        if (e.card.id == cardId && e.isWanted == isWanted)
          e.copyWith(quantity: quantity)
        else
          e
    ];
    _persist();
  }

  void setCondition(String cardId, bool isWanted, String condition) {
    state = [
      for (final e in state)
        if (e.card.id == cardId && e.isWanted == isWanted)
          e.copyWith(condition: condition)
        else
          e
    ];
    _persist();
  }

  void remove(String cardId, bool isWanted) {
    state = state
        .where((e) => !(e.card.id == cardId && e.isWanted == isWanted))
        .toList();
    _persist();
  }

  int quantityOf(String cardId, {bool isWanted = false}) => state
      .where((e) => e.card.id == cardId && e.isWanted == isWanted)
      .fold<int>(0, (s, e) => s + e.quantity);
}

final collectionProvider =
    NotifierProvider<CollectionNotifier, List<CollectionEntry>>(
        CollectionNotifier.new);

// ---------------------------------------------------------------------------
// Lend / borrow tracker
// ---------------------------------------------------------------------------
final lendRepositoryProvider = Provider<LendRepository>(
    (ref) => LendRepository(ref.watch(sharedPreferencesProvider)));

class LendNotifier extends Notifier<List<LendGroup>> {
  @override
  List<LendGroup> build() => ref.watch(lendRepositoryProvider).load();

  void _persist() => ref.read(lendRepositoryProvider).save(state);

  /// Creates a new (empty) group and returns its id so the caller can open it.
  String createGroup({String? personName, bool isBorrowing = false}) {
    final name = personName?.trim();
    final id = DateTime.now().microsecondsSinceEpoch.toString();
    state = [
      LendGroup(
        id: id,
        personName: (name == null || name.isEmpty) ? null : name,
        isBorrowing: isBorrowing,
        createdAt: DateTime.now(),
      ),
      ...state,
    ];
    _persist();
    return id;
  }

  void removeGroup(String groupId) {
    state = state.where((g) => g.id != groupId).toList();
    _persist();
  }

  void setPersonName(String groupId, String? personName) {
    final name = personName?.trim();
    _updateGroup(
        groupId,
        (g) => g.copyWith(
              personName: name,
              clearPersonName: name == null || name.isEmpty,
            ));
  }

  void addCard(String groupId, CardModel card, {int quantity = 1}) {
    _updateGroup(groupId, (g) {
      final items = [...g.items];
      final idx = items.indexWhere((i) => i.card.id == card.id);
      if (idx >= 0) {
        items[idx] = items[idx].copyWith(quantity: items[idx].quantity + quantity);
      } else {
        items.add(LendItem(card: card, quantity: quantity));
      }
      return g.copyWith(items: items);
    });
  }

  void setCardQuantity(String groupId, String cardId, int quantity) {
    if (quantity <= 0) {
      removeCard(groupId, cardId);
      return;
    }
    _updateGroup(groupId, (g) {
      final items = [
        for (final i in g.items)
          if (i.card.id == cardId) i.copyWith(quantity: quantity) else i
      ];
      return g.copyWith(items: items);
    });
  }

  void removeCard(String groupId, String cardId) {
    _updateGroup(groupId, (g) {
      final items = g.items.where((i) => i.card.id != cardId).toList();
      return g.copyWith(items: items);
    });
  }

  void _updateGroup(String groupId, LendGroup Function(LendGroup) update) {
    state = [
      for (final g in state)
        if (g.id == groupId) update(g) else g
    ];
    _persist();
  }
}

final lendProvider =
    NotifierProvider<LendNotifier, List<LendGroup>>(LendNotifier.new);

/// A single group looked up by id, so a detail screen stays in sync and
/// re-renders as cards are added/removed (returns null if it was deleted).
final lendGroupProvider = Provider.family<LendGroup?, String>((ref, id) {
  final groups = ref.watch(lendProvider);
  for (final g in groups) {
    if (g.id == id) return g;
  }
  return null;
});

// ---------------------------------------------------------------------------
// Trade history (saved trades)
// ---------------------------------------------------------------------------
final tradeRepositoryProvider = Provider<TradeRepository>(
    (ref) => TradeRepository(ref.watch(sharedPreferencesProvider)));

class TradeHistoryNotifier extends Notifier<List<Trade>> {
  @override
  List<Trade> build() => ref.watch(tradeRepositoryProvider).load();

  void _persist() => ref.read(tradeRepositoryProvider).save(state);

  void addTrade(Trade trade) {
    state = [trade, ...state];
    _persist();
  }

  void remove(String id) {
    state = state.where((t) => t.id != id).toList();
    _persist();
  }
}

final tradeHistoryProvider =
    NotifierProvider<TradeHistoryNotifier, List<Trade>>(
        TradeHistoryNotifier.new);

// ---------------------------------------------------------------------------
// Live trade draft (the balancer)
// ---------------------------------------------------------------------------
class TradeDraftNotifier extends Notifier<Trade> {
  @override
  Trade build() {
    // Re-price the live draft whenever the price source/type changes, so
    // switching settings updates every existing line (and the currency),
    // not just cards added afterwards. We listen (rather than watch) so the
    // draft's cards are kept instead of being wiped on a settings change.
    ref.listen(pricingProvider, (_, next) => _repriceAll(next));
    final pricing = ref.read(pricingProvider);
    return Trade(
      id: 'draft',
      createdAt: DateTime.now(),
      currencySymbol: pricing.symbol,
    );
  }

  /// Recomputes [TradeItem.priceEach] for every line from the current pricing
  /// and refreshes the draft's currency symbol.
  void _repriceAll(Pricing pricing) {
    state = state.copyWith(
      haveItems: [
        for (final i in state.haveItems)
          i.copyWith(priceEach: pricing.value(i.card) ?? 0)
      ],
      wantItems: [
        for (final i in state.wantItems)
          i.copyWith(priceEach: pricing.value(i.card) ?? 0)
      ],
      currencySymbol: pricing.symbol,
    );
  }

  void addCard(TradeSide side, CardModel card, {int quantity = 1}) {
    final pricing = ref.read(pricingProvider);
    final price = pricing.value(card) ?? 0;
    final items = side == TradeSide.have
        ? [...state.haveItems]
        : [...state.wantItems];
    final idx = items.indexWhere((i) => i.card.id == card.id);
    if (idx >= 0) {
      items[idx] =
          items[idx].copyWith(quantity: items[idx].quantity + quantity);
    } else {
      items.add(
          TradeItem(card: card, quantity: quantity, priceEach: price));
    }
    state = side == TradeSide.have
        ? state.copyWith(haveItems: items)
        : state.copyWith(wantItems: items);
  }

  /// Swaps the printing of an existing line (e.g. Normal <-> Foil), keeping the
  /// quantity and re-pricing for the new finish. Merges if the target printing
  /// is already present on the same side.
  void replaceCard(TradeSide side, String oldCardId, CardModel newCard) {
    if (oldCardId == newCard.id) return;
    final pricing = ref.read(pricingProvider);
    final items = side == TradeSide.have
        ? [...state.haveItems]
        : [...state.wantItems];
    final idx = items.indexWhere((i) => i.card.id == oldCardId);
    if (idx < 0) return;
    final qty = items[idx].quantity;
    final existing = items.indexWhere((i) => i.card.id == newCard.id);
    if (existing >= 0 && existing != idx) {
      items[existing] =
          items[existing].copyWith(quantity: items[existing].quantity + qty);
      items.removeAt(idx);
    } else {
      items[idx] = TradeItem(
          card: newCard, quantity: qty, priceEach: pricing.value(newCard) ?? 0);
    }
    state = side == TradeSide.have
        ? state.copyWith(haveItems: items)
        : state.copyWith(wantItems: items);
  }

  void setQuantity(TradeSide side, String cardId, int quantity) {
    List<TradeItem> items = side == TradeSide.have
        ? [...state.haveItems]
        : [...state.wantItems];
    if (quantity <= 0) {
      items = items.where((i) => i.card.id != cardId).toList();
    } else {
      items = [
        for (final i in items)
          if (i.card.id == cardId) i.copyWith(quantity: quantity) else i
      ];
    }
    state = side == TradeSide.have
        ? state.copyWith(haveItems: items)
        : state.copyWith(wantItems: items);
  }

  void removeCard(TradeSide side, String cardId) {
    final items = (side == TradeSide.have ? state.haveItems : state.wantItems)
        .where((i) => i.card.id != cardId)
        .toList();
    state = side == TradeSide.have
        ? state.copyWith(haveItems: items)
        : state.copyWith(wantItems: items);
  }

  void setCash(TradeSide side, double amount) {
    state = side == TradeSide.have
        ? state.copyWith(haveCash: amount)
        : state.copyWith(wantCash: amount);
  }

  void setNotes(String notes) => state = state.copyWith(notes: notes);

  void clear() {
    final pricing = ref.read(pricingProvider);
    state = Trade(
      id: 'draft',
      createdAt: DateTime.now(),
      currencySymbol: pricing.symbol,
    );
  }
}

final tradeDraftProvider =
    NotifierProvider<TradeDraftNotifier, Trade>(TradeDraftNotifier.new);
