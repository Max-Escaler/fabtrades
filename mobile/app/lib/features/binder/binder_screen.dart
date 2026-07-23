import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/app.dart';
import '../../app/theme.dart';
import '../../app/widgets.dart';
import '../../core/logic/pricing.dart';
import '../../core/models/binder_entry.dart';
import '../../core/providers.dart';
import '../card_detail/card_detail_screen.dart';
import '../scan/scan_screen.dart';
import '../search/card_picker.dart';
import '../want_list/want_list_screen.dart';

class BinderScreen extends ConsumerStatefulWidget {
  const BinderScreen({super.key});

  @override
  ConsumerState<BinderScreen> createState() => _BinderScreenState();
}

class _BinderScreenState extends ConsumerState<BinderScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tab = TabController(length: 2, vsync: this);

  @override
  void initState() {
    super.initState();
    _tab.addListener(() {
      if (!_tab.indexIsChanging) setState(() {});
    });
  }

  @override
  void dispose() {
    _tab.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final entries = ref.watch(binderProvider);
    final pricing = ref.watch(pricingProvider);
    final binder = entries.where((e) => !e.isWanted).toList();
    final wanted = entries.where((e) => e.isWanted).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Binder'),
        actions: const [SettingsAction()],
        bottom: TabBar(
          controller: _tab,
          tabs: [
            Tab(text: 'Binder (${_count(binder)})'),
            Tab(text: 'Want List (${_count(wanted)})'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tab,
        children: [
          _BinderList(entries: binder, pricing: pricing),
          WantListPane(
            onAdd: () => _addBySearch(isWanted: true),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        heroTag: 'binderFab',
        onPressed: () => _tab.index == 0
            ? _showBinderAddOptions(context)
            : _addBySearch(isWanted: true),
        icon: const Icon(Icons.add),
        label: Text(_tab.index == 0 ? 'Add card' : 'Add want'),
      ),
    );
  }

  int _count(List<BinderEntry> e) => e.fold<int>(0, (s, x) => s + x.quantity);

  Future<void> _showBinderAddOptions(BuildContext context) async {
    await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.qr_code_scanner),
              title: const Text('Scan cards'),
              subtitle: const Text('Add each match and keep scanning'),
              onTap: () {
                Navigator.pop(ctx);
                // Push after the sheet closes — same-frame pop+push can drop
                // the route on some Android builds.
                WidgetsBinding.instance.addPostFrameCallback((_) {
                  if (context.mounted) ScanScreen.forBinder(context);
                });
              },
            ),
            ListTile(
              leading: const Icon(Icons.search),
              title: const Text('Add by search'),
              onTap: () {
                Navigator.pop(ctx);
                WidgetsBinding.instance.addPostFrameCallback((_) {
                  if (context.mounted) _addBySearch(isWanted: false);
                });
              },
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _addBySearch({required bool isWanted}) async {
    final card = await CardPickerScreen.show(context,
        title: isWanted ? 'Add to Want List' : 'Add to Binder');
    if (card != null) {
      ref.read(binderProvider.notifier).add(card, isWanted: isWanted);
    }
  }
}

class _BinderList extends ConsumerWidget {
  const _BinderList({required this.entries, required this.pricing});

  final List<BinderEntry> entries;
  final Pricing pricing;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (entries.isEmpty) {
      return _BinderEmptyState(
        onScan: () {
          if (context.mounted) ScanScreen.forBinder(context);
        },
        onSearch: () async {
          final card =
              await CardPickerScreen.show(context, title: 'Add to Binder');
          if (card != null) {
            ref.read(binderProvider.notifier).add(card);
          }
        },
      );
    }

    final total = entries.fold<double>(
        0, (s, e) => s + (pricing.value(e.card) ?? 0) * e.quantity);

    return Column(
      children: [
        _TotalHeader(
          count: entries.fold<int>(0, (s, e) => s + e.quantity),
          total: pricing.formatValue(total),
        ),
        Expanded(
          child: ListView.separated(
            padding: const EdgeInsets.only(bottom: 96),
            itemCount: entries.length,
            separatorBuilder: (_, _) => const Divider(height: 1, indent: 72),
            itemBuilder: (context, i) =>
                _EntryRow(entry: entries[i], pricing: pricing),
          ),
        ),
      ],
    );
  }
}

class _BinderEmptyState extends StatelessWidget {
  const _BinderEmptyState({required this.onScan, required this.onSearch});
  final VoidCallback onScan;
  final VoidCallback onSearch;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.menu_book_outlined, size: 56, color: scheme.outline),
            const SizedBox(height: 16),
            Text('Your Binder is empty',
                style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            Text(
              'Add the cards you\'re willing to trade. Scan a stack or search '
              'by name — no separate chore.',
              textAlign: TextAlign.center,
              style: TextStyle(color: scheme.onSurfaceVariant),
            ),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: onScan,
              icon: const Icon(Icons.qr_code_scanner),
              label: const Text('Scan cards'),
            ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: onSearch,
              icon: const Icon(Icons.search),
              label: const Text('Add by search'),
            ),
          ],
        ),
      ),
    );
  }
}

class _TotalHeader extends StatelessWidget {
  const _TotalHeader({required this.count, required this.total});
  final int count;
  final String total;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    const color = AppTheme.positive;
    return Container(
      margin: const EdgeInsets.all(12),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        children: [
          const Icon(Icons.menu_book, color: color),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Binder value',
                  style: theme.textTheme.bodySmall
                      ?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
              Text('$count cards', style: theme.textTheme.bodyMedium),
            ],
          ),
          const Spacer(),
          Text(total,
              style: theme.textTheme.headlineSmall
                  ?.copyWith(fontWeight: FontWeight.w800, color: color)),
        ],
      ),
    );
  }
}

class _EntryRow extends ConsumerWidget {
  const _EntryRow({required this.entry, required this.pricing});
  final BinderEntry entry;
  final Pricing pricing;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final notifier = ref.read(binderProvider.notifier);
    final card = entry.card;
    final lineValue = (pricing.value(card) ?? 0) * entry.quantity;

    return Dismissible(
      key: ValueKey('${card.id}_${entry.isWanted}'),
      direction: DismissDirection.endToStart,
      background: Container(
        color: AppTheme.negative,
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        child: const Icon(Icons.delete, color: Colors.white),
      ),
      onDismissed: (_) => notifier.remove(card.id, entry.isWanted),
      child: InkWell(
        onTap: () => Navigator.of(context).push(MaterialPageRoute(
            builder: (_) => CardDetailScreen(card: card))),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          child: Row(
            children: [
              CardThumbnail(url: card.imageUrl, foil: card.isFoil),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(card.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            fontSize: 15, fontWeight: FontWeight.w600)),
                    const SizedBox(height: 3),
                    CardMetaLine(card: card),
                    const SizedBox(height: 5),
                    Row(
                      children: [
                        RarityBadge(rarity: card.rarity),
                        if (card.finishBadgeLabel != null) ...[
                          const SizedBox(width: 5),
                          FinishBadge(card: card),
                        ],
                        const SizedBox(width: 5),
                        _ConditionChip(
                          condition: entry.condition,
                          onChanged: (c) => notifier.setCondition(
                              card.id, entry.isWanted, c),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(pricing.formatValue(lineValue),
                      style: theme.textTheme.titleSmall
                          ?.copyWith(fontWeight: FontWeight.w800)),
                  if (pricing.lowPriceLabel(card) != null)
                    Text(pricing.lowPriceLabel(card)!,
                        style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant)),
                  const SizedBox(height: 4),
                  _MiniStepper(
                    qty: entry.quantity,
                    onInc: () => notifier.setQuantity(
                        card.id, entry.isWanted, entry.quantity + 1),
                    onDec: () => notifier.setQuantity(
                        card.id, entry.isWanted, entry.quantity - 1),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ConditionChip extends StatelessWidget {
  const _ConditionChip({required this.condition, required this.onChanged});
  final String condition;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return PopupMenuButton<String>(
      onSelected: onChanged,
      itemBuilder: (_) => BinderEntry.conditions
          .map((c) => PopupMenuItem(value: c, child: Text(c)))
          .toList(),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
        decoration: BoxDecoration(
          color: scheme.secondaryContainer,
          borderRadius: BorderRadius.circular(6),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(condition,
                style: TextStyle(
                    fontSize: 10.5,
                    fontWeight: FontWeight.w700,
                    color: scheme.onSecondaryContainer)),
            Icon(Icons.arrow_drop_down,
                size: 14, color: scheme.onSecondaryContainer),
          ],
        ),
      ),
    );
  }
}

class _MiniStepper extends StatelessWidget {
  const _MiniStepper(
      {required this.qty, required this.onInc, required this.onDec});
  final int qty;
  final VoidCallback onInc;
  final VoidCallback onDec;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      decoration: BoxDecoration(
        color: scheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          InkWell(
            onTap: onDec,
            child: const Padding(
                padding: EdgeInsets.all(5), child: Icon(Icons.remove, size: 15)),
          ),
          SizedBox(
            width: 20,
            child: Text('$qty',
                textAlign: TextAlign.center,
                style: const TextStyle(
                    fontWeight: FontWeight.w700, fontSize: 13)),
          ),
          InkWell(
            onTap: onInc,
            child: const Padding(
                padding: EdgeInsets.all(5), child: Icon(Icons.add, size: 15)),
          ),
        ],
      ),
    );
  }
}
