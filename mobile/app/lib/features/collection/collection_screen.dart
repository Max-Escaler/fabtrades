import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/app.dart';
import '../../app/theme.dart';
import '../../app/widgets.dart';
import '../../core/logic/pricing.dart';
import '../../core/models/collection_entry.dart';
import '../../core/providers.dart';
import '../card_detail/card_detail_screen.dart';
import '../search/card_picker.dart';

class CollectionScreen extends ConsumerStatefulWidget {
  const CollectionScreen({super.key});

  @override
  ConsumerState<CollectionScreen> createState() => _CollectionScreenState();
}

class _CollectionScreenState extends ConsumerState<CollectionScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tab = TabController(length: 2, vsync: this);

  @override
  void dispose() {
    _tab.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final entries = ref.watch(collectionProvider);
    final pricing = ref.watch(pricingProvider);
    final owned = entries.where((e) => !e.isWanted).toList();
    final wanted = entries.where((e) => e.isWanted).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Collection'),
        actions: const [SettingsAction()],
        bottom: TabBar(
          controller: _tab,
          tabs: [
            Tab(text: 'Owned (${_count(owned)})'),
            Tab(text: 'Want list (${_count(wanted)})'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tab,
        children: [
          _CollectionList(
            entries: owned,
            pricing: pricing,
            isWanted: false,
            emptyText: 'No cards in your collection yet.',
          ),
          _CollectionList(
            entries: wanted,
            pricing: pricing,
            isWanted: true,
            emptyText: 'Your want list is empty.',
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        heroTag: 'collectionFab',
        onPressed: () => _add(context),
        icon: const Icon(Icons.add),
        label: Text(_tab.index == 0 ? 'Add card' : 'Add want'),
      ),
    );
  }

  int _count(List<CollectionEntry> e) => e.fold<int>(0, (s, x) => s + x.quantity);

  Future<void> _add(BuildContext context) async {
    final isWanted = _tab.index == 1;
    final card = await CardPickerScreen.show(context,
        title: isWanted ? 'Add to want list' : 'Add to collection');
    if (card != null) {
      ref.read(collectionProvider.notifier).add(card, isWanted: isWanted);
    }
  }
}

class _CollectionList extends ConsumerWidget {
  const _CollectionList({
    required this.entries,
    required this.pricing,
    required this.isWanted,
    required this.emptyText,
  });

  final List<CollectionEntry> entries;
  final Pricing pricing;
  final bool isWanted;
  final String emptyText;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (entries.isEmpty) {
      return Center(
        child: Text(emptyText,
            style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant)),
      );
    }
    final total = entries.fold<double>(
        0, (s, e) => s + (pricing.value(e.card) ?? 0) * e.quantity);

    return Column(
      children: [
        _TotalHeader(
            count: entries.fold<int>(0, (s, e) => s + e.quantity),
            total: pricing.formatValue(total),
            isWanted: isWanted),
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

class _TotalHeader extends StatelessWidget {
  const _TotalHeader(
      {required this.count, required this.total, required this.isWanted});
  final int count;
  final String total;
  final bool isWanted;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = isWanted ? AppTheme.wantAccent : AppTheme.positive;
    return Container(
      margin: const EdgeInsets.all(12),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        children: [
          Icon(isWanted ? Icons.favorite : Icons.inventory_2, color: color),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(isWanted ? 'Want list value' : 'Collection value',
                  style: theme.textTheme.bodySmall
                      ?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
              Text('$count cards',
                  style: theme.textTheme.bodyMedium),
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
  final CollectionEntry entry;
  final Pricing pricing;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final notifier = ref.read(collectionProvider.notifier);
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
                        if (card.isFoil) ...[
                          const SizedBox(width: 5),
                          const PillBadge(
                              label: 'FOIL',
                              color: Color(0xFF9B5DE5),
                              icon: Icons.auto_awesome),
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
      itemBuilder: (_) => CollectionEntry.conditions
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
