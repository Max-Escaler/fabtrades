import 'package:flutter_test/flutter_test.dart';
import 'package:fabtrades/core/models/app_settings.dart';
import 'package:fabtrades/core/providers.dart';
import 'package:fabtrades/features/settings/settings_screen.dart';

import '../support/harness.dart';

void main() {
  testWidgets('renders both settings sections', (tester) async {
    await pumpApp(tester, const SettingsScreen());
    expect(find.text('Settings'), findsOneWidget);
    expect(find.text('PRICE SOURCE'), findsOneWidget);
    expect(find.text('PRICE TYPE'), findsOneWidget);
  });

  testWidgets('selecting CardMarket updates settings state', (tester) async {
    final container = await pumpApp(tester, const SettingsScreen());
    expect(container.read(settingsProvider).source, PriceSource.tcgplayer);

    await tester.tap(find.text('CardMarket'));
    await tester.pumpAndSettle();

    expect(container.read(settingsProvider).source, PriceSource.cardmarket);
  });

  testWidgets('selecting Low updates the price type', (tester) async {
    final container = await pumpApp(tester, const SettingsScreen());
    expect(container.read(settingsProvider).type, PriceType.market);

    await tester.tap(find.text('Low'));
    await tester.pumpAndSettle();

    expect(container.read(settingsProvider).type, PriceType.low);
  });
}
