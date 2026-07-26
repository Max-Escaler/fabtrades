import 'package:fabtrades/core/scan/ocr_guide_filter.dart';
import 'package:fabtrades/core/scan/phash.dart';
import 'package:flutter_test/flutter_test.dart';

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
}
