import 'dart:async';
import 'dart:ui' as ui;

import 'package:fabtrades/app/widgets.dart';
import 'package:fabtrades/core/data/set_logo_cache.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

/// ImageProvider that never produces a frame (simulates a disk/memory miss).
class _NeverLoadingImageProvider
    extends ImageProvider<_NeverLoadingImageProvider> {
  @override
  Future<_NeverLoadingImageProvider> obtainKey(ImageConfiguration configuration) {
    return SynchronousFuture<_NeverLoadingImageProvider>(this);
  }

  @override
  ImageStreamCompleter loadImage(
    _NeverLoadingImageProvider key,
    ImageDecoderCallback decode,
  ) {
    return MultiFrameImageStreamCompleter(
      codec: Completer<ui.Codec>().future,
      scale: 1,
    );
  }
}

Future<void> _pushAndPopRoute(
  WidgetTester tester, {
  required String routeTitle,
}) async {
  await tester.tap(find.byIcon(Icons.chevron_right));
  await tester.pumpAndSettle();
  expect(find.text(routeTitle), findsOneWidget);

  await tester.pageBack();
  // Immediate frame after pop — this is when logos used to unload/reload.
  await tester.pump();
}

Widget _browseHarness({
  required String setName,
  required String url,
  required String pushedTitle,
}) {
  return MaterialApp(
    home: Builder(
      builder: (context) {
        return Scaffold(
          body: ListTile(
            title: SetLogoTitle(
              setName: setName,
              logoUrl: url,
              debugImageProvider: _NeverLoadingImageProvider(),
            ),
            trailing: IconButton(
              icon: const Icon(Icons.chevron_right),
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => Scaffold(
                      appBar: AppBar(title: Text(pushedTitle)),
                      body: const SizedBox.shrink(),
                    ),
                  ),
                );
              },
            ),
          ),
        );
      },
    ),
  );
}

void main() {
  tearDown(() {
    SetLogoTitle.debugResetWarmUrls();
    SetLogoCache.debugResetPins();
  });

  testWidgets(
    'warm logos do not flash the set name while the image re-resolves',
    (tester) async {
      const url = 'https://example.com/cru.png';
      SetLogoTitle.markWarm(url);

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SetLogoTitle(
              setName: 'Crucible of War',
              logoUrl: url,
              debugImageProvider: _NeverLoadingImageProvider(),
            ),
          ),
        ),
      );

      // Symptom of the Settings→back / set drill-in bug: set name reappears.
      expect(find.text('Crucible of War'), findsNothing);
    },
  );

  testWidgets(
    'cold logos show the set name until the first frame arrives',
    (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SetLogoTitle(
              setName: 'Crucible of War',
              logoUrl: 'https://example.com/cru.png',
              debugImageProvider: _NeverLoadingImageProvider(),
            ),
          ),
        ),
      );

      expect(find.text('Crucible of War'), findsOneWidget);
    },
  );

  testWidgets(
    'warm logos stay quiet across Settings push/pop during a cache miss',
    (tester) async {
      const url = 'https://example.com/cru.png';
      const setName = 'Crucible of War';
      SetLogoTitle.markWarm(url);

      await tester.pumpWidget(
        MaterialApp(
          home: Builder(
            builder: (context) {
              return Scaffold(
                appBar: AppBar(
                  actions: [
                    IconButton(
                      icon: const Icon(Icons.tune),
                      onPressed: () {
                        Navigator.of(context).push(
                          MaterialPageRoute<void>(
                            builder: (_) => Scaffold(
                              appBar: AppBar(title: const Text('Settings')),
                              body: const SizedBox.shrink(),
                            ),
                          ),
                        );
                      },
                    ),
                  ],
                ),
                body: SetLogoTitle(
                  setName: setName,
                  logoUrl: url,
                  debugImageProvider: _NeverLoadingImageProvider(),
                ),
              );
            },
          ),
        ),
      );

      expect(find.text(setName), findsNothing);

      await tester.tap(find.byIcon(Icons.tune));
      await tester.pumpAndSettle();
      expect(find.text('Settings'), findsOneWidget);

      await tester.pageBack();
      await tester.pump();
      expect(find.text(setName), findsNothing);

      await tester.pumpAndSettle();
      expect(find.text(setName), findsNothing);
    },
  );

  testWidgets(
    'warm logos stay quiet across set drill-in push/pop during a cache miss',
    (tester) async {
      const url = 'https://example.com/cru.png';
      const setName = 'Crucible of War';
      SetLogoTitle.markWarm(url);

      await tester.pumpWidget(
        _browseHarness(
          setName: setName,
          url: url,
          pushedTitle: setName,
        ),
      );

      expect(find.text(setName), findsNothing);

      await _pushAndPopRoute(tester, routeTitle: setName);
      expect(find.text(setName), findsNothing);

      await tester.pumpAndSettle();
      expect(find.text(setName), findsNothing);
    },
  );

  test('memory precache uses the same resize key as SetLogoTitle', () {
    const height = SetLogoCache.defaultHeight;
    const dpr = 2.0;
    final memH = SetLogoCache.memCacheHeightFor(height, dpr);
    expect(memH, ((height + SetLogoCache.platePadding) * dpr).round());

    final a = SetLogoCache.providerFor('https://example.com/a.png',
        memCacheHeight: memH);
    final b = SetLogoCache.providerFor('https://example.com/a.png',
        memCacheHeight: memH);
    expect(a, b);
  });
}
