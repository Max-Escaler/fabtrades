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
                ? 'Shows market as the main price and low as a smaller sub-price (USD).'
                : 'Shows trend as the main price and low as a smaller sub-price (EUR).',
            style: theme.textTheme.bodySmall
                ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
          ),
          const SizedBox(height: 28),
          _SectionLabel('Appearance'),
          const SizedBox(height: 8),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            secondary: Icon(
              settings.themeMode == AppThemeMode.dark
                  ? Icons.dark_mode
                  : Icons.light_mode,
            ),
            title: const Text('Dark mode'),
            subtitle: Text(
              settings.themeMode == AppThemeMode.dark
                  ? 'Using the dark theme.'
                  : 'Using the light theme.',
              style: theme.textTheme.bodySmall
                  ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
            ),
            value: settings.themeMode == AppThemeMode.dark,
            onChanged: (on) => notifier.setThemeMode(
              on ? AppThemeMode.dark : AppThemeMode.light,
            ),
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
                      'Trade values use the market/trend price from the source selected here.',
                      style: theme.textTheme.bodySmall,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),
          _SectionLabel('About'),
          const SizedBox(height: 8),
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.phone_android_outlined),
            title: const Text('App version'),
            subtitle: Text(
              ref.watch(packageVersionLabelProvider).when(
                    data: (label) => label,
                    loading: () => '…',
                    error: (_, _) => 'Unknown',
                  ),
              style: theme.textTheme.bodySmall
                  ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
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
