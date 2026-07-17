import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../app/app.dart';
import '../../app/widgets.dart';
import '../../core/data/card_repository.dart';
import '../../core/data/set_logo_cache.dart';
import '../../core/data/set_logos.dart';
import '../../core/providers.dart';
import '../card_detail/card_detail_screen.dart';
import '../scan/scan_screen.dart';

/// Top-level Browse tab: a global search bar over every set, then a list of
/// sets to drill into. Searching short-circuits the set list and shows grouped
/// results across the whole catalog.
class BrowseScreen extends ConsumerStatefulWidget {
  const BrowseScreen({super.key});

  @override
  ConsumerState<BrowseScreen> createState() => _BrowseScreenState();
}

class _BrowseScreenState extends ConsumerState<BrowseScreen> {
  final _controller = TextEditingController();
  Timer? _debounce;
  String _query = '';

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
      setState(() => _query = value.trim());
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
              MaterialPageRoute(builder: (_) => const ScanScreen()),
            ),
          ),
          const SettingsAction(),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 4, 12, 8),
            child: TextField(
              controller: _controller,
              onChanged: _onChanged,
              textInputAction: TextInputAction.search,
              decoration: InputDecoration(
                hintText: 'Search all cards…',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _controller.text.isEmpty
                    ? null
                    : IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: _clear,
                      ),
              ),
            ),
          ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: _refresh,
              child: searching
                  ? _GlobalSearchResults(query: _query)
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
        for (final c in cards) {
          if (isNonCardProduct(c)) continue;
          final s = c.setName;
          if (s == null) continue;
          final id = c.setId;
          if (id != null) setIds.putIfAbsent(s, () => id);
        }
        final sets = CardRepository.setNamesFrom(cards);
        if (sets.isEmpty) {
          return const _ScrollableCenter(child: _EmptyView());
        }
        return ListView.separated(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.symmetric(vertical: 8),
          itemCount: sets.length,
          separatorBuilder: (_, _) => const Divider(height: 1, indent: 16),
          itemBuilder: (context, i) {
            final set = sets[i];
            final logoUrl = logos.urlForGroupId(setIds[set]);
            return _SetTile(
              key: ValueKey<String>(set),
              setName: set,
              logoUrl: logoUrl,
            );
          },
        );
      },
    );
  }
}

/// One browsable set row. Kept alive so logos stay mounted while scrolling.
class _SetTile extends ConsumerStatefulWidget {
  const _SetTile({
    required this.setName,
    required this.logoUrl,
  });

  final String setName;
  final String? logoUrl;

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
      title: SetLogoTitle(setName: widget.setName, logoUrl: widget.logoUrl),
      trailing: const Icon(Icons.chevron_right),
      onTap: () {
        ref.read(searchFiltersProvider.notifier).enterSet(widget.setName);
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => SetCardsScreen(setName: widget.setName),
          ),
        );
      },
    );
  }
}

/// Grouped results for a global (all-sets) query typed in the Browse search bar.
class _GlobalSearchResults extends ConsumerWidget {
  const _GlobalSearchResults({required this.query});
  final String query;

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
        final filtered = filterCards(all, CardFilters(query: query));
        final groups = groupCardsByName(filtered, CardSort.nameAsc);
        if (groups.isEmpty) {
          return const _ScrollableCenter(child: _EmptyView());
        }
        return _GroupList(groups: groups);
      },
    );
  }
}

/// Cards within a single set, grouped by name, with search / foil / sort and
/// pull-to-refresh.
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
  void dispose() {
    _debounce?.cancel();
    _controller.dispose();
    super.dispose();
  }

  void _onChanged(String value) {
    setState(() {}); // refresh clear button
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 300), () {
      ref.read(searchFiltersProvider.notifier).setQuery(value);
    });
  }

  /// Pull-to-refresh: re-query Supabase so the latest synced prices show up,
  /// then toast when the pipeline last updated pricing.
  Future<void> _refresh() => refreshPricesWithToast(context, ref);

  @override
  Widget build(BuildContext context) {
    final groups = ref.watch(browseGroupsProvider);
    final filters = ref.watch(searchFiltersProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.setName),
        actions: const [SettingsAction()],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 4, 12, 8),
            child: TextField(
              controller: _controller,
              onChanged: _onChanged,
              textInputAction: TextInputAction.search,
              decoration: InputDecoration(
                hintText: 'Search in ${widget.setName}…',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _controller.text.isEmpty
                    ? null
                    : IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _controller.clear();
                          ref
                              .read(searchFiltersProvider.notifier)
                              .setQuery('');
                          setState(() {});
                        },
                      ),
              ),
            ),
          ),
          _FilterBar(filters: filters),
          const SizedBox(height: 4),
          Expanded(
            child: RefreshIndicator(
              onRefresh: _refresh,
              child: groups.when(
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
                  return _GroupList(groups: list);
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

/// A scrollable list of grouped cards, shared by the set view and global search.
class _GroupList extends StatelessWidget {
  const _GroupList({required this.groups});
  final List<CardGroup> groups;

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.only(bottom: 16),
      itemCount: groups.length,
      separatorBuilder: (_, _) => const Divider(height: 1, indent: 14),
      itemBuilder: (context, i) => _GroupTile(group: groups[i]),
    );
  }
}

/// One card name in the grouped browse list. Tapping opens the card detail
/// screen, where the printings selector lets the user switch between every
/// version.
class _GroupTile extends ConsumerWidget {
  const _GroupTile({required this.group});
  final CardGroup group;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final pricing = ref.watch(pricingProvider);
    final rep = group.representative;

    void openDetail() => Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => CardDetailScreen(card: rep)),
        );

    return CardRow(
      card: rep,
      priceLabel: pricing.priceLabel(rep),
      secondaryLabel: pricing.lowPriceLabel(rep),
      priceSource: pricing.sourceLabel,
      showThumbnail: false,
      inlineBadges: true,
      onTap: openDetail,
      trailing: Icon(Icons.chevron_right,
          color: Theme.of(context).colorScheme.onSurfaceVariant),
    );
  }
}

class _FilterBar extends ConsumerWidget {
  const _FilterBar({required this.filters});
  final CardFilters filters;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notifier = ref.read(searchFiltersProvider.notifier);
    return SizedBox(
      height: 40,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        children: [
          FilterChip(
            label: const Text('Foil'),
            avatar: const Icon(Icons.auto_awesome, size: 16),
            selected: filters.foilOnly,
            onSelected: notifier.setFoilOnly,
          ),
          const SizedBox(width: 8),
          _DropChip<CardSort>(
            label: 'Sort',
            selected: filters.sort != CardSort.nameAsc,
            value: filters.sort,
            icon: Icons.sort,
            items: CardSort.values
                .map((s) =>
                    PopupMenuItem(value: s, child: Text(s.label)))
                .toList(),
            onSelected: notifier.setSort,
          ),
          if (filters.hasActiveFilters) ...[
            const SizedBox(width: 8),
            ActionChip(
              label: const Text('Clear'),
              avatar: const Icon(Icons.close, size: 16),
              onPressed: notifier.clear,
            ),
          ],
        ],
      ),
    );
  }
}

class _DropChip<T> extends StatelessWidget {
  const _DropChip({
    required this.label,
    required this.selected,
    required this.value,
    required this.items,
    required this.onSelected,
    this.icon,
  });

  final String label;
  final bool selected;
  final T value;
  final List<PopupMenuEntry<T>> items;
  final ValueChanged<T> onSelected;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return PopupMenuButton<T>(
      initialValue: value,
      onSelected: onSelected,
      itemBuilder: (_) => items,
      child: Chip(
        backgroundColor: selected ? scheme.primaryContainer : null,
        label: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (icon != null) ...[Icon(icon, size: 16), const SizedBox(width: 4)],
            Text(label),
            const Icon(Icons.arrow_drop_down, size: 18),
          ],
        ),
      ),
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
