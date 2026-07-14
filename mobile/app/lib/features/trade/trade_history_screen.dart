import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../app/theme.dart';
import '../../core/models/trade.dart';
import '../../core/providers.dart';

class TradeHistoryScreen extends ConsumerWidget {
  const TradeHistoryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final trades = ref.watch(tradeHistoryProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Trade history')),
      body: trades.isEmpty
          ? const Center(child: Text('No saved trades yet.'))
          : ListView.separated(
              padding: const EdgeInsets.all(12),
              itemCount: trades.length,
              separatorBuilder: (_, _) => const SizedBox(height: 10),
              itemBuilder: (context, i) => _TradeCard(trade: trades[i]),
            ),
    );
  }
}

class _TradeCard extends ConsumerWidget {
  const _TradeCard({required this.trade});
  final Trade trade;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final symbol = trade.currencySymbol;
    final delta = trade.delta;
    final balanced = delta.abs() < 0.01;
    final color = balanced
        ? AppTheme.positive
        : (delta > 0 ? AppTheme.negative : AppTheme.positive);
    final dateStr = DateFormat.yMMMd().add_jm().format(trade.createdAt);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.swap_horiz, size: 18, color: theme.colorScheme.primary),
                const SizedBox(width: 8),
                Text(dateStr,
                    style: theme.textTheme.labelLarge
                        ?.copyWith(fontWeight: FontWeight.w700)),
                const Spacer(),
                IconButton(
                  visualDensity: VisualDensity.compact,
                  icon: const Icon(Icons.delete_outline, size: 20),
                  onPressed: () =>
                      ref.read(tradeHistoryProvider.notifier).remove(trade.id),
                ),
              ],
            ),
            if (trade.notes.isNotEmpty) ...[
              const SizedBox(height: 2),
              Text(trade.notes,
                  style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant)),
            ],
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: _sideSummary(theme, 'Gave',
                      '${trade.haveCount} cards', trade.haveTotal, symbol,
                      AppTheme.haveAccent),
                ),
                Icon(Icons.arrow_forward,
                    color: theme.colorScheme.onSurfaceVariant),
                Expanded(
                  child: _sideSummary(theme, 'Got',
                      '${trade.wantCount} cards', trade.wantTotal, symbol,
                      AppTheme.wantAccent, alignEnd: true),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Align(
              alignment: Alignment.center,
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.14),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  balanced
                      ? 'Even trade'
                      : (delta > 0
                          ? 'Gave $symbol${delta.abs().toStringAsFixed(2)} more'
                          : 'Gained $symbol${delta.abs().toStringAsFixed(2)}'),
                  style: TextStyle(color: color, fontWeight: FontWeight.w700),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _sideSummary(ThemeData theme, String label, String count, double total,
      String symbol, Color accent,
      {bool alignEnd = false}) {
    return Column(
      crossAxisAlignment:
          alignEnd ? CrossAxisAlignment.end : CrossAxisAlignment.start,
      children: [
        Text(label,
            style: theme.textTheme.bodySmall
                ?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
        Text('$symbol${total.toStringAsFixed(2)}',
            style: theme.textTheme.titleMedium
                ?.copyWith(fontWeight: FontWeight.w800, color: accent)),
        Text(count, style: theme.textTheme.bodySmall),
      ],
    );
  }
}
