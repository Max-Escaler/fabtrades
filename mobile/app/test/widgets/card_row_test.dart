import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:fabtrades/app/widgets.dart';

import '../support/fixtures.dart';
import '../support/harness.dart';

void main() {
  Widget wrap(Widget child) => MaterialApp(home: Scaffold(body: child));

  Future<void> pumpRow(WidgetTester tester, Widget row) =>
      pumpApp(tester, Scaffold(body: row));

  group('CardRow', () {
    testWidgets('renders name and price', (tester) async {
      await pumpRow(
        tester,
        CardRow(
          card: buildCard(name: 'Vex - Apathetic'),
          priceLabel: '\$1.50',
        ),
      );

      expect(find.text('Vex - Apathetic'), findsOneWidget);
      expect(find.text('\$1.50'), findsOneWidget);
    });

    testWidgets('renders secondary low price when provided', (tester) async {
      await pumpRow(
        tester,
        CardRow(
          card: buildCard(name: 'Vex'),
          priceLabel: '\$2.00',
          secondaryLabel: 'Low \$1.25',
        ),
      );

      expect(find.text('\$2.00'), findsOneWidget);
      expect(find.text('Low \$1.25'), findsOneWidget);
    });

    testWidgets('shows FOIL badge for foil printings', (tester) async {
      await pumpRow(
        tester,
        CardRow(
          card: buildCard(name: 'Vex', isFoil: true),
          priceLabel: '\$2.00',
        ),
      );
      expect(find.text('FOIL'), findsOneWidget);
    });

    testWidgets('hides FOIL badge for non-foil printings', (tester) async {
      await pumpRow(
        tester,
        CardRow(
          card: buildCard(name: 'Vex', isFoil: false),
          priceLabel: '\$2.00',
        ),
      );
      expect(find.text('FOIL'), findsNothing);
    });

    testWidgets('calls onAdd when the add button is tapped', (tester) async {
      var added = false;
      await pumpRow(
        tester,
        CardRow(
          card: buildCard(name: 'Vex'),
          priceLabel: '\$1.00',
          onAdd: () => added = true,
        ),
      );

      await tester.tap(find.byIcon(Icons.add_circle_outline));
      expect(added, isTrue);
    });

    testWidgets('omits the thumbnail when showThumbnail is false',
        (tester) async {
      await pumpRow(
        tester,
        CardRow(
          card: buildCard(name: 'Vex'),
          priceLabel: '\$1.00',
          showThumbnail: false,
        ),
      );
      expect(find.byType(CardThumbnail), findsNothing);
    });
  });

  group('RarityBadge', () {
    testWidgets('renders the rarity label', (tester) async {
      await tester.pumpWidget(wrap(const RarityBadge(rarity: 'Rare')));
      expect(find.text('Rare'), findsOneWidget);
    });

    testWidgets('renders nothing for None/empty rarity', (tester) async {
      await tester.pumpWidget(wrap(const RarityBadge(rarity: 'None')));
      expect(find.byType(PillBadge), findsNothing);
    });
  });

  group('CardMetaLine', () {
    testWidgets('joins set name and collector number', (tester) async {
      await tester.pumpWidget(wrap(CardMetaLine(
        card: buildCard(setName: 'Origins', collectorNumber: '015/219'),
      )));
      expect(find.text('Origins  •  #015/219'), findsOneWidget);
    });
  });

  group('CardThumbnail', () {
    testWidgets('shows a placeholder icon when url is null', (tester) async {
      await tester.pumpWidget(wrap(const CardThumbnail(url: null)));
      expect(find.byIcon(Icons.image_not_supported_outlined), findsOneWidget);
    });
  });
}
