import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/app.dart';
import '../../app/theme.dart';
import '../../app/widgets.dart';
import '../../core/data/card_repository.dart';
import '../../core/logic/pricing.dart';
import '../../core/models/app_settings.dart';
import '../../core/models/card_model.dart';
import '../../core/models/trade.dart';
import '../../core/providers.dart';
import '../scan/scan_screen.dart';
import '../search/card_picker.dart';
import 'trade_filler_sheet.dart';
import 'trade_history_screen.dart';

/// Smallest fraction of the split area either list can be squeezed to.
const double _minFraction = 0.15;
const double _dragBarHeight = 128;

class TradeScreen extends ConsumerStatefulWidget {
  const TradeScreen({super.key});

  @override
  ConsumerState<TradeScreen> createState() => _TradeScreenState();
}

class _TradeScreenState extends ConsumerState<TradeScreen> {
  /// Fraction of the resizable area given to the top ("Their cards") list.
  double _topFraction = 0.5;

  @override
  Widget build(BuildContext context) {
    final trade = ref.watch(tradeDraftProvider);
    final settings = ref.watch(settingsProvider);
    final pricing = ref.watch(pricingProvider);
    final notifier = ref.read(tradeDraftProvider.notifier);
    final isEmpty = trade.haveItems.isEmpty && trade.wantItems.isEmpty;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Trade'),
        actions: [
          IconButton(
            icon: const Icon(Icons.history),
            tooltip: 'Trade history',
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const TradeHistoryScreen()),
            ),
          ),
          if (!isEmpty)
            IconButton(
              icon: const Icon(Icons.delete_sweep_outlined),
              tooltip: 'Clear trade',
              onPressed: () => _confirmClear(context, notifier),
            ),
          const SettingsAction(),
        ],
      ),
      body: LayoutBuilder(
        builder: (context, constraints) {
          // Flex-based split so panes can never be sized negative, regardless
          // of the available height.
          final avail =
              (constraints.maxHeight - _dragBarHeight).clamp(1.0, double.infinity);
          final frac = _topFraction.clamp(_minFraction, 1 - _minFraction);
          final topFlex = (frac * 1000).round();

          return Column(
            children: [
              Expanded(
                flex: topFlex,
                child: _TradeSideList(
                  side: TradeSide.want,
                  title: 'Their cards',
                  accent: AppTheme.wantAccent,
                  items: trade.wantItems,
                  symbol: trade.currencySymbol,
                  addLabel: 'Add their cards',
                ),
              ),
              _DragBar(
                trade: trade,
                settings: settings,
                pricing: pricing,
                onFindFiller: () => showTradeFillerSheet(context, ref),
                onDrag: (dy) {
                  setState(() {
                    _topFraction =
                        (frac + dy / avail).clamp(_minFraction, 1 - _minFraction);
                  });
                },
              ),
              Expanded(
                flex: 1000 - topFlex,
                child: _TradeSideList(
                  side: TradeSide.have,
                  title: 'My cards',
                  accent: AppTheme.haveAccent,
                  items: trade.haveItems,
                  symbol: trade.currencySymbol,
                  addLabel: 'Add my cards',
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  void _confirmClear(BuildContext context, TradeDraftNotifier notifier) {
    showAdaptiveDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog.adaptive(
        title: const Text('Clear trade?'),
        content: const Text('This removes all cards from the trade.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel')),
          FilledButton(
            onPressed: () {
              notifier.clear();
              Navigator.pop(ctx);
            },
            child: const Text('Clear'),
          ),
        ],
      ),
    );
  }
}

Future<void> _pick(BuildContext context, WidgetRef ref, TradeSide side) async {
  final card = await CardPickerScreen.show(context,
      title: side == TradeSide.have ? 'Add my cards' : 'Add their cards');
  if (card != null) {
    ref.read(tradeDraftProvider.notifier).addCard(side, card);
  }
}

Future<void> _scan(BuildContext context, WidgetRef ref, TradeSide side) {
  return ScanScreen.forTrade(context, side);
}

/// One scrollable, always-visible side of the trade with an "Add …" footer row.
class _TradeSideList extends ConsumerWidget {
  const _TradeSideList({
    required this.side,
    required this.title,
    required this.accent,
    required this.items,
    required this.symbol,
    required this.addLabel,
  });

  final TradeSide side;
  final String title;
  final Color accent;
  final List<TradeItem> items;
  final String symbol;
  final String addLabel;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notifier = ref.read(tradeDraftProvider.notifier);
    final catalog = ref.watch(catalogProvider).asData?.value ?? const [];
    final pricing = ref.watch(pricingProvider);
    return DecoratedBox(
      decoration: BoxDecoration(
        border: Border(left: BorderSide(color: accent, width: 3)),
      ),
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          for (final item in items)
            _TradeItemRow(
              item: item,
              symbol: symbol,
              lowEach: pricing.lowValue(item.card),
              onInc: () =>
                  notifier.setQuantity(side, item.card.id, item.quantity + 1),
              onDec: () =>
                  notifier.setQuantity(side, item.card.id, item.quantity - 1),
              onRemove: () => notifier.removeCard(side, item.card.id),
              onTap: () => _editFinish(
                  context, ref, side, item, oppositeFinish(catalog, item.card)),
            ),
          AddListRow(
            label: addLabel,
            onTap: () => _pick(context, ref, side),
          ),
          AddListRow(
            label: 'Scan a card to add',
            icon: Icons.qr_code_scanner,
            onTap: () => _scan(context, ref, side),
          ),
        ],
      ),
    );
  }
}

/// The draggable summary bar between the two lists. Drag vertically to give
/// more room to either side; shows each side's market + low totals and delta.
class _DragBar extends StatelessWidget {
  const _DragBar({
    required this.trade,
    required this.settings,
    required this.pricing,
    required this.onDrag,
    required this.onFindFiller,
  });

  final Trade trade;
  final AppSettings settings;
  final Pricing pricing;
  final ValueChanged<double> onDrag;
  final VoidCallback onFindFiller;

  double _lowTotal(List<TradeItem> items, double cash) =>
      items.fold<double>(
            0,
            (s, i) => s + (pricing.lowValue(i.card) ?? 0) * i.quantity,
          ) +
          cash;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final symbol = trade.currencySymbol;
    final theirs = trade.wantTotal;
    final mine = trade.haveTotal;
    final theirLow = _lowTotal(trade.wantItems, trade.wantCash);
    final myLow = _lowTotal(trade.haveItems, trade.haveCash);
    final diff = theirs - mine; // + => you gain value
    final lowDiff = theirLow - myLow;
    final balanced = diff.abs() < 0.01;
    final Color deltaColor = balanced
        ? theme.colorScheme.onSurfaceVariant
        : (diff >= 0 ? AppTheme.positive : AppTheme.negative);
    final String deltaText = balanced
        ? 'Even'
        : '${diff >= 0 ? '+' : '-'}$symbol${diff.abs().toStringAsFixed(2)}';
    final String lowDeltaText = lowDiff.abs() < 0.01
        ? 'Low Even'
        : 'Low ${lowDiff >= 0 ? '+' : '-'}$symbol${lowDiff.abs().toStringAsFixed(2)}';
    final showLow = theirLow > 0 || myLow > 0;

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onVerticalDragUpdate: (d) => onDrag(d.delta.dy),
      child: Container(
        height: _dragBarHeight,
        decoration: BoxDecoration(
          color: theme.colorScheme.surfaceContainerHigh,
          border: Border.symmetric(
            horizontal: BorderSide(color: theme.colorScheme.outlineVariant),
          ),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 40,
              height: 4,
              margin: const EdgeInsets.only(bottom: 6),
              decoration: BoxDecoration(
                color: theme.colorScheme.outline,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            _summaryRow(
              theme,
              icon: Icons.south,
              accent: AppTheme.wantAccent,
              label: 'Their ${trade.wantCount} '
                  '${trade.wantCount == 1 ? 'card' : 'cards'}',
              value: '$symbol${theirs.toStringAsFixed(2)}',
              lowValue: showLow ? 'Low $symbol${theirLow.toStringAsFixed(2)}' : null,
            ),
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 2),
              child: Row(
                children: [
                  Icon(Icons.sell_outlined,
                      size: 13, color: theme.colorScheme.onSurfaceVariant),
                  const SizedBox(width: 5),
                  Flexible(
                    child: Text(
                      settings.source.label,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant),
                    ),
                  ),
                  const Spacer(),
                  // When the sides don't match, offer a shortcut to find cards
                  // that fill the value gap; it lives in the bar's empty middle.
                  if (!balanced) ...[
                    _FindFillerButton(onTap: onFindFiller),
                    const Spacer(),
                  ],
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(balanced ? Icons.balance : Icons.trending_up,
                              size: 15, color: deltaColor),
                          const SizedBox(width: 4),
                          Text(deltaText,
                              style: theme.textTheme.titleSmall?.copyWith(
                                  color: deltaColor,
                                  fontWeight: FontWeight.w800)),
                        ],
                      ),
                      if (showLow)
                        Text(
                          lowDeltaText,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant,
                            fontSize: 11,
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            ),
            _summaryRow(
              theme,
              icon: Icons.north,
              accent: AppTheme.haveAccent,
              label: 'My ${trade.haveCount} '
                  '${trade.haveCount == 1 ? 'card' : 'cards'}',
              value: '$symbol${mine.toStringAsFixed(2)}',
              lowValue: showLow ? 'Low $symbol${myLow.toStringAsFixed(2)}' : null,
            ),
          ],
        ),
      ),
    );
  }

  Widget _summaryRow(
    ThemeData theme, {
    required IconData icon,
    required Color accent,
    required String label,
    required String value,
    String? lowValue,
  }) {
    return Row(
      children: [
        Icon(icon, size: 15, color: accent),
        const SizedBox(width: 6),
        Text(label,
            style: theme.textTheme.bodyMedium
                ?.copyWith(fontWeight: FontWeight.w600)),
        const Spacer(),
        Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(value,
                style: theme.textTheme.titleSmall
                    ?.copyWith(fontWeight: FontWeight.w800)),
            if (lowValue != null)
              Text(
                lowValue,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                  fontSize: 11,
                ),
              ),
          ],
        ),
      ],
    );
  }
}

/// Compact "Find Trade Filler" pill shown in the drag bar's empty middle space
/// whenever the two sides are not of equal value.
class _FindFillerButton extends StatelessWidget {
  const _FindFillerButton({required this.onTap});
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Material(
      color: scheme.primaryContainer,
      borderRadius: BorderRadius.circular(20),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.auto_fix_high,
                  size: 14, color: scheme.onPrimaryContainer),
              const SizedBox(width: 5),
              Text(
                'Find Trade Filler',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: scheme.onPrimaryContainer,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _TradeItemRow extends StatelessWidget {
  const _TradeItemRow({
    required this.item,
    required this.symbol,
    required this.lowEach,
    required this.onInc,
    required this.onDec,
    required this.onRemove,
    required this.onTap,
  });
  final TradeItem item;
  final String symbol;
  final double? lowEach;
  final VoidCallback onInc;
  final VoidCallback onDec;
  final VoidCallback onRemove;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 6, 6, 6),
        child: Row(
          children: [
            CardThumbnail(
                url: item.card.imageUrl,
                foil: item.card.isFoil,
                width: 36,
                height: 50),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(item.card.name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                                fontWeight: FontWeight.w600, fontSize: 14)),
                      ),
                      if (item.card.isFoil) ...[
                        const SizedBox(width: 6),
                        const PillBadge(
                            label: 'FOIL',
                            color: Color(0xFF9B5DE5),
                            icon: Icons.auto_awesome),
                      ],
                    ],
                  ),
                  Text(
                    '$symbol${item.priceEach.toStringAsFixed(2)} ea · $symbol${item.lineTotal.toStringAsFixed(2)}',
                    style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant),
                  ),
                  if (lowEach != null)
                    Text(
                      'Low $symbol${lowEach!.toStringAsFixed(2)} ea',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                        fontSize: 11,
                      ),
                    ),
                ],
              ),
            ),
            _QtyStepper(qty: item.quantity, onInc: onInc, onDec: onDec),
            IconButton(
              visualDensity: VisualDensity.compact,
              icon: const Icon(Icons.close, size: 18),
              onPressed: onRemove,
            ),
          ],
        ),
      ),
    );
  }
}

/// Bottom sheet to switch a trade line between its Normal and Foil printing.
/// The Foil switch is disabled when the card has no alternate finish.
void _editFinish(
  BuildContext context,
  WidgetRef ref,
  TradeSide side,
  TradeItem item,
  CardModel? counterpart,
) {
  final pricing = ref.read(pricingProvider);
  final card = item.card;
  final normal = card.isFoil ? counterpart : card;
  final foil = card.isFoil ? card : counterpart;

  showModalBottomSheet<void>(
    context: context,
    showDragHandle: true,
    builder: (ctx) {
      final theme = Theme.of(ctx);
      return SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  CardThumbnail(
                      url: card.imageUrl,
                      foil: card.isFoil,
                      width: 40,
                      height: 56),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(card.name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: theme.textTheme.titleMedium
                                ?.copyWith(fontWeight: FontWeight.w700)),
                        CardMetaLine(card: card),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                secondary: Icon(Icons.auto_awesome,
                    color: card.isFoil
                        ? const Color(0xFF9B5DE5)
                        : theme.colorScheme.onSurfaceVariant),
                title: const Text('Foil'),
                subtitle: Text(
                  counterpart == null
                      ? 'No foil version of this card'
                      : 'Foil ${pricing.priceLabel(foil!)}  ·  Normal ${pricing.priceLabel(normal!)}',
                  style: theme.textTheme.bodySmall,
                ),
                value: card.isFoil,
                onChanged: counterpart == null
                    ? null
                    : (_) {
                        ref
                            .read(tradeDraftProvider.notifier)
                            .replaceCard(side, card.id, counterpart);
                        Navigator.pop(ctx);
                      },
              ),
            ],
          ),
        ),
      );
    },
  );
}

class _QtyStepper extends StatelessWidget {
  const _QtyStepper(
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
          _stepBtn(Icons.remove, onDec),
          SizedBox(
            width: 22,
            child: Text('$qty',
                textAlign: TextAlign.center,
                style: const TextStyle(fontWeight: FontWeight.w700)),
          ),
          _stepBtn(Icons.add, onInc),
        ],
      ),
    );
  }

  Widget _stepBtn(IconData icon, VoidCallback onTap) => InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: () {
          HapticFeedback.selectionClick();
          onTap();
        },
        child: Padding(
            padding: const EdgeInsets.all(6), child: Icon(icon, size: 16)),
      );
}

