import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/models/app_settings.dart';
import '../core/providers.dart';
import '../features/lend/lend_screen.dart';
import '../features/search/search_screen.dart';
import '../features/settings/settings_screen.dart';
import '../features/trade/trade_screen.dart';
import '../features/update/update_prompt.dart';
import '../features/want_list/want_list_screen.dart';
import 'theme.dart';

class FabTradesApp extends ConsumerWidget {
  const FabTradesApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final settings = ref.watch(settingsProvider);
    return MaterialApp(
      title: 'FAB Trades',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      themeMode: settings.themeMode == AppThemeMode.dark
          ? ThemeMode.dark
          : ThemeMode.light,
      home: const UpdatePromptHost(child: HomeShell()),
    );
  }
}

class HomeShell extends ConsumerStatefulWidget {
  const HomeShell({super.key});

  @override
  ConsumerState<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends ConsumerState<HomeShell> {
  int _index = 0;

  // Note: the Scan feature (ScanScreen) is still implemented and can be
  // re-enabled by adding it back here and to the navigation destinations.
  static const _screens = [
    BrowseScreen(),
    TradeScreen(),
    WantListScreen(),
    LendScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    final draft = ref.watch(tradeDraftProvider);
    final tradeCount = draft.haveCount + draft.wantCount;

    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: IndexedStack(index: _index, children: _screens),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) {
          if (i != _index) HapticFeedback.selectionClick();
          setState(() => _index = i);
        },
        destinations: [
          const NavigationDestination(
            icon: Icon(Icons.grid_view_outlined),
            selectedIcon: Icon(Icons.grid_view),
            label: 'Browse',
          ),
          NavigationDestination(
            icon: Badge(
              isLabelVisible: tradeCount > 0,
              label: Text('$tradeCount'),
              child: const Icon(Icons.swap_horiz_outlined),
            ),
            selectedIcon: Badge(
              isLabelVisible: tradeCount > 0,
              label: Text('$tradeCount'),
              child: const Icon(Icons.swap_horiz),
            ),
            label: 'Trade',
          ),
          const NavigationDestination(
            icon: Icon(Icons.favorite_border),
            selectedIcon: Icon(Icons.favorite),
            label: 'Want List',
          ),
          const NavigationDestination(
            icon: Icon(Icons.sync_alt_outlined),
            selectedIcon: Icon(Icons.sync_alt),
            label: 'Lend',
          ),
        ],
      ),
    );
  }
}

/// Shared app bar action to open settings.
class SettingsAction extends StatelessWidget {
  const SettingsAction({super.key});

  @override
  Widget build(BuildContext context) {
    return IconButton(
      icon: const Icon(Icons.tune),
      tooltip: 'Settings',
      onPressed: () => Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => const SettingsScreen()),
      ),
    );
  }
}
