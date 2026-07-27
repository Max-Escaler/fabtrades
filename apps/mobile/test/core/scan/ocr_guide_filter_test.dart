import 'package:fabtrades/core/data/card_repository.dart';
import 'package:fabtrades/core/scan/ocr_guide_filter.dart';
import 'package:fabtrades/core/scan/phash.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/fixtures.dart';

OcrLine _line({
  required double left,
  required double top,
  required double right,
  required double bottom,
  required String text,
}) => (left: left, top: top, right: right, bottom: bottom, text: text);

void main() {
  // Typical upright portrait frame with a centered guide.
  const rotatedW = 720.0;
  const rotatedH = 1280.0;
  final guide = guideRectInRotatedFrame(
    rotatedWidth: rotatedW,
    rotatedHeight: rotatedH,
  );

  group('textInsideGuide', () {
    test('keeps a line whose centre is inside the guide', () {
      final line = _line(
        left: guide.left + 10,
        top: guide.top + 10,
        right: guide.left + 200,
        bottom: guide.top + 40,
        text: 'Snatch',
      );
      final result = textInsideGuide(
        lines: [line],
        guideLeft: guide.left,
        guideTop: guide.top,
        guideWidth: guide.width,
        guideHeight: guide.height,
      );
      expect(result.linesInGuide, 1);
      expect(result.guideText, 'Snatch');
    });

    test('drops a line entirely below the guide', () {
      final below = _line(
        left: guide.left + 10,
        top: guide.top + guide.height + 20,
        right: guide.left + 200,
        bottom: guide.top + guide.height + 50,
        text: 'Neighbour',
      );
      final result = textInsideGuide(
        lines: [below],
        guideLeft: guide.left,
        guideTop: guide.top,
        guideWidth: guide.width,
        guideHeight: guide.height,
      );
      expect(result.linesInGuide, 0);
      expect(result.guideText, isEmpty);
      expect(result.titleBandText, isEmpty);
    });

    test(
      'keeps a line straddling the guide edge within the inflate margin',
      () {
        // Centre just outside the geometric bottom edge, but inside the 2%
        // inflation so edge-hugging boxes aren't lost.
        final marginY = guide.height * 0.02;
        final cy = guide.top + guide.height + marginY * 0.5;
        final line = _line(
          left: guide.left + 10,
          top: cy - 10,
          right: guide.left + 200,
          bottom: cy + 10,
          text: 'Edge',
        );
        final result = textInsideGuide(
          lines: [line],
          guideLeft: guide.left,
          guideTop: guide.top,
          guideWidth: guide.width,
          guideHeight: guide.height,
        );
        expect(result.linesInGuide, 1);
        expect(result.guideText, 'Edge');
      },
    );

    test('separates title-band text from lower in-guide text', () {
      final title = _line(
        left: guide.left + 20,
        top: guide.top + 8,
        right: guide.left + 300,
        bottom: guide.top + 36,
        text: 'Hot Streak',
      );
      final body = _line(
        left: guide.left + 20,
        top: guide.top + guide.height * 0.5,
        right: guide.left + 180,
        bottom: guide.top + guide.height * 0.5 + 24,
        text: 'Action',
      );
      final result = textInsideGuide(
        lines: [title, body],
        guideLeft: guide.left,
        guideTop: guide.top,
        guideWidth: guide.width,
        guideHeight: guide.height,
      );
      expect(result.linesInGuide, 2);
      expect(result.linesInTitleBand, 1);
      expect(result.titleBandText, 'Hot Streak');
      expect(result.guideText, 'Hot Streak\nAction');
      expect(result.titleBandText, isNot(contains('Action')));
    });

    test('preserves reading order (top then left)', () {
      final a = _line(
        left: guide.left + 100,
        top: guide.top + 10,
        right: guide.left + 200,
        bottom: guide.top + 30,
        text: 'Second',
      );
      final b = _line(
        left: guide.left + 20,
        top: guide.top + 10,
        right: guide.left + 90,
        bottom: guide.top + 30,
        text: 'First',
      );
      final c = _line(
        left: guide.left + 20,
        top: guide.top + 40,
        right: guide.left + 200,
        bottom: guide.top + 60,
        text: 'Third',
      );
      final result = textInsideGuide(
        lines: [a, c, b],
        guideLeft: guide.left,
        guideTop: guide.top,
        guideWidth: guide.width,
        guideHeight: guide.height,
      );
      expect(result.guideText, 'First\nSecond\nThird');
    });

    test('reports nothing in guide so the caller can fall back', () {
      final outside = _line(
        left: 0,
        top: 0,
        right: 40,
        bottom: 20,
        text: 'Noise',
      );
      final result = textInsideGuide(
        lines: [outside],
        guideLeft: guide.left,
        guideTop: guide.top,
        guideWidth: guide.width,
        guideHeight: guide.height,
      );
      expect(result.linesInGuide, 0);
      expect(result.linesInTitleBand, 0);
      expect(result.guideText, isEmpty);
      expect(result.titleBandText, isEmpty);
    });

    test('regression: neighbour title below the guide does not enter the '
        'title band', () {
      // Card A fills the guide; card B's title bar sits just under it —
      // the real binder mis-identify that motivated the guide crop.
      final cardA = _line(
        left: guide.left + 30,
        top: guide.top + 12,
        right: guide.left + guide.width - 30,
        bottom: guide.top + guide.height * kCardTitleBandFraction * 0.7,
        text: 'Templar Spellbane',
      );
      final cardB = _line(
        left: guide.left + 30,
        top: guide.top + guide.height + 8,
        right: guide.left + guide.width - 30,
        bottom: guide.top + guide.height + 40,
        text: 'Throttle',
      );
      final result = textInsideGuide(
        lines: [cardA, cardB],
        guideLeft: guide.left,
        guideTop: guide.top,
        guideWidth: guide.width,
        guideHeight: guide.height,
      );
      expect(result.titleBandText, contains('Templar Spellbane'));
      expect(result.titleBandText, isNot(contains('Throttle')));
      expect(result.guideText, isNot(contains('Throttle')));
      expect(result.linesInTitleBand, 1);
    });
  });

  group('textInsideDetectedBounds', () {
    test('isolates the top band of the detected text union', () {
      // Synthetic full-frame OCR with no on-screen guide hit: title at the
      // top of the union box, rules text lower down.
      final title = _line(
        left: 100,
        top: 200,
        right: 400,
        bottom: 230,
        text: 'Read the Runes',
      );
      final body = _line(
        left: 100,
        top: 500,
        right: 450,
        bottom: 540,
        text: 'Create a Runechant token',
      );
      final result = textInsideDetectedBounds([title, body]);
      expect(result.linesInGuide, 2);
      expect(result.linesInTitleBand, 1);
      expect(result.titleBandText, 'Read the Runes');
      expect(result.titleBandText, isNot(contains('Runechant')));
      expect(result.guideText, contains('Runechant'));
    });

    test('empty list returns empty strings', () {
      final result = textInsideDetectedBounds(const []);
      expect(result.linesInGuide, 0);
      expect(result.linesInTitleBand, 0);
      expect(result.titleBandText, isEmpty);
      expect(result.guideText, isEmpty);
    });

    test('a lone line is the title band, not an empty one', () {
      // The union box is that one line, so its centre sits at 50% — past the
      // 22% band. An empty band here would gate a genuine token card out of
      // the full-frame tier.
      final only = _line(
        left: 100,
        top: 200,
        right: 400,
        bottom: 240,
        text: 'Runechant',
      );
      final result = textInsideDetectedBounds([only]);
      expect(result.linesInTitleBand, 1);
      expect(result.titleBandText, 'Runechant');
    });

    test('widens to the topmost line when the fixed fraction misses it', () {
      // Two lines close together: 22% of the short union box falls above the
      // title's centre, but the title must still win the band and the body
      // line must stay out of it.
      final title = _line(
        left: 100,
        top: 200,
        right: 400,
        bottom: 220,
        text: 'Read the Runes',
      );
      final body = _line(
        left: 100,
        top: 225,
        right: 450,
        bottom: 235,
        text: 'Create a Runechant token',
      );
      final result = textInsideDetectedBounds([title, body]);
      expect(result.linesInGuide, 2);
      expect(result.linesInTitleBand, 1);
      expect(result.titleBandText, 'Read the Runes');
      expect(result.titleBandText, isNot(contains('Runechant')));
    });
  });

  group('guide-tier token wiring', () {
    test(
      'title band excludes Runechant so identifyCards keeps Read the Runes',
      () {
        // Same geometry the live scanner uses for the guide tier: title-band
        // OCR is "Read the Runes", lower in-guide line mentions the token.
        final title = _line(
          left: guide.left + 20,
          top: guide.top + 8,
          right: guide.left + 320,
          bottom: guide.top + 36,
          text: 'Read the Runes',
        );
        final body = _line(
          left: guide.left + 20,
          top: guide.top + guide.height * 0.55,
          right: guide.left + 380,
          bottom: guide.top + guide.height * 0.55 + 28,
          text: 'Create a Runechant token',
        );
        final filtered = textInsideGuide(
          lines: [title, body],
          guideLeft: guide.left,
          guideTop: guide.top,
          guideWidth: guide.width,
          guideHeight: guide.height,
        );
        expect(filtered.titleBandText, 'Read the Runes');
        expect(filtered.titleBandText, isNot(contains('Runechant')));
        expect(filtered.guideText, contains('Runechant'));

        final readTheRunes = buildCard(
          id: 'read-the-runes',
          name: 'Read the Runes (Blue)',
          cardType: 'Action',
          collectorNumber: '189/193',
        );
        final runechant = buildCard(
          id: 'runechant',
          name: 'Runechant',
          cardType: 'Token',
          rarity: 'Token',
          collectorNumber: '001/001',
        );

        // Guide-tier wiring: recognizedText = whole guide, titleText = band.
        final result = identifyCards(
          [readTheRunes, runechant],
          filtered.guideText,
          titleText: filtered.titleBandText,
        );
        expect(result, isNotEmpty);
        expect(result.first.id, 'read-the-runes');
        expect(result.map((c) => c.id), isNot(contains('runechant')));
      },
    );
  });
}
