import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/models/app_settings.dart';
import '../../core/providers.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final settings = ref.watch(settingsProvider);
    final notifier = ref.read(settingsProvider.notifier);
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _SectionLabel('Price source'),
          const SizedBox(height: 8),
          SegmentedButton<PriceSource>(
            segments: const [
              ButtonSegment(
                value: PriceSource.tcgplayer,
                label: Text('TCGplayer'),
                icon: Icon(Icons.attach_money),
              ),
              ButtonSegment(
                value: PriceSource.cardmarket,
                label: Text('CardMarket'),
                icon: Icon(Icons.euro),
              ),
            ],
            selected: {settings.source},
            onSelectionChanged: (s) => notifier.setSource(s.first),
          ),
          const SizedBox(height: 8),
          Text(
            settings.source == PriceSource.tcgplayer
                ? 'US market prices in USD from TCGplayer.'
                : 'EU market prices in EUR from CardMarket (where matched).',
            style: theme.textTheme.bodySmall
                ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
          ),
          const SizedBox(height: 28),
          _SectionLabel('Price type'),
          const SizedBox(height: 8),
          SegmentedButton<PriceType>(
            segments: const [
              ButtonSegment(value: PriceType.market, label: Text('Market')),
              ButtonSegment(value: PriceType.low, label: Text('Low')),
            ],
            selected: {settings.type},
            onSelectionChanged: (s) => notifier.setType(s.first),
          ),
          const SizedBox(height: 8),
          Text(
            settings.type == PriceType.market
                ? 'Uses the market/trend price for trade values.'
                : 'Uses the lowest listed price for trade values.',
            style: theme.textTheme.bodySmall
                ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
          ),
          const SizedBox(height: 32),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Icon(Icons.info_outline, color: theme.colorScheme.primary),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Prices refresh daily from the shared FAB Trades database. '
                      'Trade values use the source & type selected here.',
                      style: theme.textTheme.bodySmall,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.text);
  final String text;
  @override
  Widget build(BuildContext context) {
    return Text(
      text.toUpperCase(),
      style: Theme.of(context).textTheme.labelMedium?.copyWith(
            letterSpacing: 0.8,
            fontWeight: FontWeight.w700,
            color: Theme.of(context).colorScheme.primary,
          ),
    );
  }
}
