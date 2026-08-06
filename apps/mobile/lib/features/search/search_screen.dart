import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../app/app.dart';
import '../../app/card_filter_bar.dart';
import '../../app/widgets.dart';
import '../../core/analytics/analytics.dart';
import '../../core/data/card_repository.dart';
import '../../core/data/set_logo_cache.dart';
import '../../core/data/set_logos.dart';
import '../../core/data/set_published_on.dart';
import '../../core/logic/set_abbreviation.dart';
import '../../core/logic/set_sort.dart';
import '../../core/models/card_model.dart';
import '../../core/providers.dart';
import '../card_detail/card_detail_screen.dart';
import '../scan/scan_screen.dart';

/// Top-level Browse tab: a global search bar over every set, then a list of
/// sets to drill into. Searching short-circuits the set list and shows every
/// matching printing across the whole catalog (so each finish/version has its
/// own price row).
class BrowseScreen extends ConsumerStatefulWidget {
  const BrowseScreen({super.key});

  @override
  ConsumerState<BrowseScreen> createState() => _BrowseScreenState();
}

class _BrowseScreenState extends ConsumerState<BrowseScreen> {
  final _controller = TextEditingController();
  Timer? _debounce;
  String _query = '';
  CardSort _sort = CardSort.nameAsc;

  @override
  void dispose() {
    _debounce?.cancel();
    _controller.dispose();
    super.dispose();
  }

  void _onChanged(String value) {
    setState(() {}); // refresh clear button
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 250), () {
      final query = value.trim();
      setState(() => _query = query);
      if (query.isEmpty) return;
      final catalog = ref.read(catalogProvider).asData?.value ?? const [];
      final resultsCount = filterCards(
        catalog,
        CardFilters(query: query, sort: _sort),
      ).length;
      ref.read(analyticsProvider).capture('search_performed', {
        'search_query': query,
        'query_length': query.length,
        'results_count': resultsCount,
      });
    });
  }

  void _clear() {
    _controller.clear();
    _debounce?.cancel();
    setState(() => _query = '');
  }

  Future<void> _refresh() => refreshPricesWithToast(context, ref);

  @override
  Widget build(BuildContext context) {
    final searching = _query.isNotEmpty;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Browse'),
        actions: [
          IconButton(
            icon: const Icon(Icons.qr_code_scanner),
            tooltip: 'Scan a card',
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute(
                settings: const RouteSettings(name: 'Scan'),
                builder: (_) => const ScanScreen(),
              ),
            ),
          ),
          const AppMenuAction(),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 4, 12, 8),
            child: CardSearchBar(
              controller: _controller,
              hintText: 'Search all cards…',
              onChanged: _onChanged,
              onClear: _clear,
              sort: _sort,
              onSort: (s) => setState(() => _sort = s),
            ),
          ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: _refresh,
              child: searching
                  ? _GlobalSearchResults(query: _query, sort: _sort)
                  : const _SetList(),
            ),
          ),
        ],
      ),
    );
  }
}

/// The list of sets to drill into (shown when the global search is empty).
class _SetList extends ConsumerStatefulWidget {
  const _SetList();

  @override
  ConsumerState<_SetList> createState() => _SetListState();
}

class _SetListState extends ConsumerState<_SetList> {
  var _memoryPrecacheStarted = false;

  void _precacheLogosIfNeeded(SetLogoMap logos) {
    if (_memoryPrecacheStarted || logos.isEmpty) return;
    _memoryPrecacheStarted = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      SetLogoCache.precacheIntoMemory(
        context,
        logos.urls,
        onCached: SetLogoTitle.markWarm,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    // Flesh and Blood has ~100 sets that grow over time, so the browsable set
    // list is derived from whatever the pipeline has loaded rather than a fixed
    // list. Watching the catalog here also preloads it as soon as the app
    // opens, so tapping into a set later is instant.
    final catalog = ref.watch(catalogProvider);
    final logos = ref.watch(setLogoMapProvider).asData?.value ?? SetLogoMap.empty;
    final publishedOn =
        ref.watch(setPublishedOnMapProvider).asData?.value ??
            SetPublishedOnMap.empty;
    _precacheLogosIfNeeded(logos);
    return catalog.when(
      loading: () => const Center(child: CircularProgressIndicator.adaptive()),
      error: (e, _) => _ScrollableCenter(
        child: _ErrorView(
          message: e.toString(),
          onRetry: () => ref.invalidate(catalogProvider),
        ),
      ),
      data: (cards) {
        // setName → TCGplayer group id (for logo lookup). First seen wins.
        final setIds = <String, int>{};
        final collectorNumbersBySet = <String, List<String?>>{};
        for (final c in cards) {
          if (isNonCardProduct(c)) continue;
          final s = c.setName;
          if (s == null) continue;
          final id = c.setId;
          if (id != null) setIds.putIfAbsent(s, () => id);
          collectorNumbersBySet.putIfAbsent(s, () => <String?>[]).add(
                c.collectorNumber,
              );
        }
        final sets = CardRepository.setNamesFrom(
          cards,
          publishedOnForGroupId: publishedOn.forGroupId,
        );
        if (sets.isEmpty) {
          return const _ScrollableCenter(child: _EmptyView());
        }

        // Flatten section headers + set rows so one ListView can render both.
        final entries = <_BrowseEntry>[];
        int? lastTier;
        for (final set in sets) {
          final tier = setBrowseTier(set);
          if (tier != lastTier) {
            entries.add(_BrowseSectionHeader(browseTierLabel(tier)));
            lastTier = tier;
          }
          final groupId = setIds[set];
          final abbreviation = resolveSetAbbreviation(
            logos.abbreviationForGroupId(groupId),
            collectorNumbersBySet[set] ?? const <String?>[],
          );
          entries.add(
            _BrowseSetRow(
              setName: set,
              logoUrl: logos.urlForGroupId(groupId),
              abbreviation: abbreviation,
              alwaysShowName: tier == BrowseTier.silverAge,
            ),
          );
        }

        // Retained frames in SetLogoCache keep logos painted if a row is
        // disposed while a set is open and remounted on pop.
        return ListView.builder(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.symmetric(vertical: 8),
          itemCount: entries.length,
          itemBuilder: (context, i) {
            final entry = entries[i];
            return switch (entry) {
              _BrowseSectionHeader(:final label) => _SetSectionHeader(
                  label: label,
                  isFirst: i == 0,
                ),
              _BrowseSetRow(
                :final setName,
                :final logoUrl,
                :final abbreviation,
                :final alwaysShowName,
              ) =>
                Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    _SetTile(
                      key: ValueKey<String>(setName),
                      setName: setName,
                      logoUrl: logoUrl,
                      abbreviation: abbreviation,
                      alwaysShowName: alwaysShowName,
                    ),
                    if (i < entries.length - 1 && entries[i + 1] is _BrowseSetRow)
                      const Divider(height: 1, indent: 16),
                  ],
                ),
            };
          },
        );
      },
    );
  }
}

sealed class _BrowseEntry {
  const _BrowseEntry();
}

class _BrowseSectionHeader extends _BrowseEntry {
  const _BrowseSectionHeader(this.label);
  final String label;
}

class _BrowseSetRow extends _BrowseEntry {
  const _BrowseSetRow({
    required this.setName,
    required this.logoUrl,
    required this.abbreviation,
    required this.alwaysShowName,
  });
  final String setName;
  final String? logoUrl;
  final String abbreviation;
  final bool alwaysShowName;
}

class _SetSectionHeader extends StatelessWidget {
  const _SetSectionHeader({required this.label, required this.isFirst});

  final String label;
  final bool isFirst;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    return Padding(
      padding: EdgeInsets.fromLTRB(16, isFirst ? 4 : 16, 16, 6),
      child: Text(
        label.toUpperCase(),
        style: theme.textTheme.labelLarge?.copyWith(
          color: scheme.onSurfaceVariant,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.8,
        ),
      ),
    );
  }
}

/// One browsable set row. Kept alive so logos stay mounted while scrolling.
class _SetTile extends ConsumerStatefulWidget {
  const _SetTile({
    super.key,
    required this.setName,
    required this.logoUrl,
    required this.abbreviation,
    required this.alwaysShowName,
  });

  final String setName;
  final String? logoUrl;
  final String abbreviation;
  final bool alwaysShowName;

  @override
  ConsumerState<_SetTile> createState() => _SetTileState();
}

class _SetTileState extends ConsumerState<_SetTile>
    with AutomaticKeepAliveClientMixin {
  @override
  bool get wantKeepAlive => true;

  @override
  Widget build(BuildContext context) {
    super.build(context);
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      title: SetLogoTitle(
        setName: widget.setName,
        logoUrl: widget.logoUrl,
        abbreviation: widget.abbreviation,
        alwaysShowName: widget.alwaysShowName,
      ),
      trailing: const Icon(Icons.chevron_right),
      onTap: () {
        ref.read(searchFiltersProvider.notifier).enterSet(widget.setName);
        Navigator.of(context).push(
          MaterialPageRoute(
            settings: const RouteSettings(name: 'Set Cards'),
            builder: (_) => SetCardsScreen(setName: widget.setName),
          ),
        );
      },
    );
  }
}

/// Flat printing results for a global (all-sets) query typed in the Browse
/// search bar. Each finish/version is its own row so prices are visible
/// without opening card detail.
class _GlobalSearchResults extends ConsumerWidget {
  const _GlobalSearchResults({required this.query, required this.sort});
  final String query;
  final CardSort sort;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final catalog = ref.watch(catalogProvider);
    return catalog.when(
      loading: () => const Center(child: CircularProgressIndicator.adaptive()),
      error: (e, _) => _ScrollableCenter(
        child: _ErrorView(
          message: e.toString(),
          onRetry: () => ref.invalidate(catalogProvider),
        ),
      ),
      data: (all) {
        final filtered =
            filterCards(all, CardFilters(query: query, sort: sort));
        if (filtered.isEmpty) {
          return const _ScrollableCenter(child: _EmptyView());
        }
        return _PrintingList(cards: filtered, source: 'search');
      },
    );
  }
}

/// Cards within a single set — every printing listed individually — with
/// search / sort and pull-to-refresh.
class SetCardsScreen extends ConsumerStatefulWidget {
  const SetCardsScreen({super.key, required this.setName});

  final String setName;

  @override
  ConsumerState<SetCardsScreen> createState() => _SetCardsScreenState();
}

class _SetCardsScreenState extends ConsumerState<SetCardsScreen> {
  final _controller = TextEditingController();
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    ref.read(analyticsProvider).capture('set_opened', {
      'set_name': widget.setName,
    });
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _controller.dispose();
    super.dispose();
  }

  void _onChanged(String value) {
    setState(() {}); // refresh clear button
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 300), () {
      final query = value.trim();
      ref.read(searchFiltersProvider.notifier).setQuery(value);
      if (query.isEmpty) return;
      final resultsCount =
          ref.read(browseResultsProvider).asData?.value.length ?? 0;
      ref.read(analyticsProvider).capture('search_performed', {
        'search_query': query,
        'query_length': query.length,
        'results_count': resultsCount,
      });
    });
  }

  /// Clear the TextField and the provider query together so they cannot desync.
  void _clearQuery() {
    _debounce?.cancel();
    _controller.clear();
    ref.read(searchFiltersProvider.notifier).setQuery('');
    setState(() {});
  }

  /// Pull-to-refresh: re-query Supabase so the latest synced prices show up,
  /// then toast when the pipeline last updated pricing.
  Future<void> _refresh() => refreshPricesWithToast(context, ref);

  @override
  Widget build(BuildContext context) {
    final results = ref.watch(browseResultsProvider);
    final filters = ref.watch(searchFiltersProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.setName),
        actions: const [AppMenuAction()],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 4, 12, 8),
            child: CardSearchBar(
              controller: _controller,
              hintText: 'Search in ${widget.setName}…',
              onChanged: _onChanged,
              onClear: _clearQuery,
              sort: filters.sort,
              onSort: (s) =>
                  ref.read(searchFiltersProvider.notifier).setSort(s),
            ),
          ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: _refresh,
              child: results.when(
                loading: () =>
                    const Center(child: CircularProgressIndicator.adaptive()),
                error: (e, _) => _ScrollableCenter(
                  child: _ErrorView(
                    message: e.toString(),
                    onRetry: () => ref.invalidate(catalogProvider),
                  ),
                ),
                data: (list) {
                  if (list.isEmpty) {
                    return const _ScrollableCenter(child: _EmptyView());
                  }
                  return _PrintingList(cards: list, source: 'set');
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Refreshes the catalog from Supabase, then shows a toast noting when the
/// pricing pipeline last refreshed prices (and from which marketplace).
Future<void> refreshPricesWithToast(BuildContext context, WidgetRef ref) async {
  try {
    await ref.read(catalogProvider.notifier).refresh();
  } catch (_) {
    if (context.mounted) {
      ScaffoldMessenger.of(context)
        ..clearSnackBars()
        ..showSnackBar(const SnackBar(
          behavior: SnackBarBehavior.floating,
          content: Text('Could not refresh prices. Check your connection.'),
        ));
    }
    return;
  }
  ref.read(analyticsProvider).capture('prices_refreshed');
  if (!context.mounted) return;
  final updatedAt = ref.read(priceUpdatedAtProvider);
  final source = ref.read(pricingProvider).sourceLabel;
  ScaffoldMessenger.of(context)
    ..clearSnackBars()
    ..showSnackBar(
      SnackBar(
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 3),
        content: Row(
          children: [
            const Icon(Icons.schedule, size: 18, color: Colors.white),
            const SizedBox(width: 10),
            Expanded(
              child: Text('${_priceUpdatedLabel(updatedAt)} · $source pricing'),
            ),
          ],
        ),
      ),
    );
}

/// A short, human "prices updated …" phrase from the pipeline timestamp.
String _priceUpdatedLabel(DateTime? updatedAt) {
  if (updatedAt == null) return 'Prices refreshed';
  final local = updatedAt.toLocal();
  final diff = DateTime.now().difference(local);
  final String when;
  if (diff.inMinutes < 1) {
    when = 'just now';
  } else if (diff.inMinutes < 60) {
    when = '${diff.inMinutes}m ago';
  } else if (diff.inHours < 24) {
    when = '${diff.inHours}h ago';
  } else if (diff.inDays == 1) {
    when = 'yesterday';
  } else if (diff.inDays < 7) {
    when = '${diff.inDays}d ago';
  } else {
    when = DateFormat('MMM d').format(local);
  }
  return 'Prices updated $when';
}

/// A scrollable list of individual printings, shared by the set view and
/// global search. Each row opens card detail with that printing pre-selected.
class _PrintingList extends StatelessWidget {
  const _PrintingList({required this.cards, required this.source});
  final List<CardModel> cards;

  /// Where these results came from — `search` or `set` — passed through to
  /// [CardDetailScreen] for the `card_detail_viewed` event.
  final String source;

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.only(bottom: 16),
      itemCount: cards.length,
      separatorBuilder: (_, _) => const Divider(height: 1, indent: 14),
      itemBuilder: (context, i) =>
          _PrintingTile(card: cards[i], source: source),
    );
  }
}

/// One printing in the browse list. Tapping opens card detail with this
/// printing selected; the detail screen's version selector still lists every
/// sibling printing of the same card.
class _PrintingTile extends ConsumerWidget {
  const _PrintingTile({required this.card, required this.source});
  final CardModel card;
  final String source;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final pricing = ref.watch(pricingProvider);

    void openDetail() => Navigator.of(context).push(
          MaterialPageRoute(
            settings: const RouteSettings(name: 'Card Detail'),
            builder: (_) => CardDetailScreen(card: card, source: source),
          ),
        );

    return CardRow(
      card: card,
      priceLabel: pricing.priceLabel(card),
      secondaryLabel: pricing.lowPriceLabel(card),
      priceSource: pricing.sourceLabel,
      showThumbnail: false,
      inlineBadges: true,
      onTap: openDetail,
      trailing: Icon(Icons.chevron_right,
          color: Theme.of(context).colorScheme.onSurfaceVariant),
    );
  }
}

/// Wraps a centered widget in an always-scrollable view so pull-to-refresh
/// still works when the list is empty or errored.
class _ScrollableCenter extends StatelessWidget {
  const _ScrollableCenter({required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) => SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: ConstrainedBox(
          constraints: BoxConstraints(minHeight: constraints.maxHeight),
          child: Center(child: child),
        ),
      ),
    );
  }
}

class _EmptyView extends StatelessWidget {
  const _EmptyView();
  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(Icons.search_off, size: 48, color: scheme.outline),
        const SizedBox(height: 12),
        const Text('No cards match your filters.'),
      ],
    );
  }
}

class _ErrorView extends StatelessWidget {
  const _ErrorView({required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.cloud_off, size: 44),
          const SizedBox(height: 12),
          Text('Could not load cards.\n$message',
              textAlign: TextAlign.center),
          const SizedBox(height: 16),
          FilledButton.tonal(onPressed: onRetry, child: const Text('Retry')),
        ],
      ),
    );
  }
}
