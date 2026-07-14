import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/theme.dart';
import '../../app/widgets.dart';
import '../../core/logic/pricing.dart';
import '../../core/models/card_model.dart';
import '../../core/models/trade.dart';
import '../../core/providers.dart';

/// Opens the "Find Trade Filler" popup. It looks at the current value gap
/// between the two sides of the live trade and suggests catalog cards whose
/// price most closely matches that gap, so the player who owes value can spot
/// a card they might have to even things out.
Future<void> showTradeFillerSheet(BuildContext context, WidgetRef ref) {
  return showModalBottomSheet<void>(
    context: context,
    showDragHandle: true,
    isScrollControlled: true,
    builder: (_) => const _TradeFillerSheet(),
  );
}

/// A candidate filler card together with how far its price sits from the gap.
class _FillerMatch {
  const _FillerMatch({
    required this.card,
    required this.price,
    required this.gapDistance,
  });

  final CardModel card;
  final double price;

  /// Absolute distance between this card's price and the value gap to fill.
  final double gapDistance;
}

class _TradeFillerSheet extends ConsumerStatefulWidget {
  const _TradeFillerSheet();

  @override
  ConsumerState<_TradeFillerSheet> createState() => _TradeFillerSheetState();
}

class _TradeFillerSheetState extends ConsumerState<_TradeFillerSheet> {
  static const int _maxResults = 60;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final trade = ref.watch(tradeDraftProvider);
    final pricing = ref.watch(pricingProvider);
    final catalog = ref.watch(catalogProvider).asData?.value ?? const [];

    final symbol = trade.currencySymbol;
    // + gap => their side is worth more, so MY (have) side needs value.
    // - gap => my side is worth more, so THEIR (want) side needs value.
    final gap = trade.wantTotal - trade.haveTotal;
    final target = gap.abs();
    final balanced = target < 0.01;
    final fillSide = gap > 0 ? TradeSide.have : TradeSide.want;
    final sideIsMine = fillSide == TradeSide.have;

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
        child: ConstrainedBox(
          constraints: BoxConstraints(
            maxHeight: MediaQuery.sizeOf(context).height * 0.8,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _header(theme, symbol, target, balanced, sideIsMine),
              const SizedBox(height: 12),
              if (balanced)
                _balancedState(theme)
              else ...[
                _resultsHeader(theme),
                const SizedBox(height: 8),
                Flexible(
                  child: _results(
                    context: context,
                    theme: theme,
                    catalog: catalog,
                    pricing: pricing,
                    target: target,
                    fillSide: fillSide,
                    symbol: symbol,
                    catalogLoading:
                        ref.watch(catalogProvider).asData == null,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _header(
    ThemeData theme,
    String symbol,
    double target,
    bool balanced,
    bool sideIsMine,
  ) {
    final scheme = theme.colorScheme;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: scheme.primaryContainer,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(Icons.balance, color: scheme.onPrimaryContainer),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Find Trade Filler',
                  style: theme.textTheme.titleLarge
                      ?.copyWith(fontWeight: FontWeight.w800)),
              const SizedBox(height: 2),
              Text(
                balanced
                    ? 'This trade is already even.'
                    : '${sideIsMine ? 'Your' : 'Their'} side needs '
                        '$symbol${target.toStringAsFixed(2)} more to balance.',
                style: theme.textTheme.bodyMedium
                    ?.copyWith(color: scheme.onSurfaceVariant),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _balancedState(ThemeData theme) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 24),
      child: Center(
        child: Column(
          children: [
            Icon(Icons.check_circle_outline,
                size: 40, color: AppTheme.positive),
            const SizedBox(height: 8),
            Text('Nothing to fill — the trade is balanced.',
                style: theme.textTheme.bodyMedium),
          ],
        ),
      ),
    );
  }

  Widget _resultsHeader(ThemeData theme) {
    return Row(
      children: [
        Icon(Icons.sort, size: 16, color: theme.colorScheme.onSurfaceVariant),
        const SizedBox(width: 6),
        Text(
          'Closest matches first',
          style: theme.textTheme.bodySmall
              ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
        ),
      ],
    );
  }

  Widget _results({
    required BuildContext context,
    required ThemeData theme,
    required List<CardModel> catalog,
    required Pricing pricing,
    required double target,
    required TradeSide fillSide,
    required String symbol,
    required bool catalogLoading,
  }) {
    if (catalogLoading && catalog.isEmpty) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 32),
        child: Center(child: CircularProgressIndicator.adaptive()),
      );
    }

    final matches = <_FillerMatch>[];
    for (final card in catalog) {
      final price = pricing.value(card);
      if (price == null || price <= 0) continue;
      matches.add(_FillerMatch(
        card: card,
        price: price,
        gapDistance: (price - target).abs(),
      ));
    }
    matches.sort((a, b) => a.gapDistance.compareTo(b.gapDistance));
    final top = matches.take(_maxResults).toList();

    if (top.isEmpty) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 32),
        child: Center(
          child: Text(
            'No priced cards available to suggest.',
            style: theme.textTheme.bodyMedium,
            textAlign: TextAlign.center,
          ),
        ),
      );
    }

    return ListView.separated(
      shrinkWrap: true,
      padding: EdgeInsets.zero,
      itemCount: top.length,
      separatorBuilder: (_, _) => const Divider(height: 1, indent: 72),
      itemBuilder: (context, i) {
        final m = top[i];
        return CardRow(
          card: m.card,
          priceLabel: pricing.priceLabel(m.card),
          secondaryLabel: _closenessLabel(m, target, symbol),
          onAdd: () => _addFiller(context, m.card, fillSide),
          onTap: () => _addFiller(context, m.card, fillSide),
        );
      },
    );
  }

  String _closenessLabel(_FillerMatch m, double target, String symbol) {
    if (m.gapDistance < 0.01) return 'Exact match';
    final over = m.price > target;
    return '$symbol${m.gapDistance.toStringAsFixed(2)} ${over ? 'over' : 'under'}';
  }

  void _addFiller(BuildContext context, CardModel card, TradeSide side) {
    ref.read(tradeDraftProvider.notifier).addCard(side, card);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          'Added ${card.name} to ${side == TradeSide.have ? 'your' : 'their'} side',
        ),
        duration: const Duration(seconds: 2),
      ),
    );
  }
}
