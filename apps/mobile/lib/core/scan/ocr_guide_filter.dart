import 'phash.dart';

/// One OCR line in upright (rotated) image coordinates — the same space as
/// [guideRectInRotatedFrame] and ML Kit's `TextLine.boundingBox`.
///
/// Kept as a plain record so this module stays pure Dart (no Flutter / ML Kit
/// imports) and can be unit-tested with synthetic boxes.
typedef OcrLine = ({
  double left,
  double top,
  double right,
  double bottom,
  String text,
});

/// Text read from inside the scan guide, split into the title band (where the
/// card's printed name lives) and everything else inside the guide.
({
  String titleBandText,
  String guideText,
  int linesInGuide,
  int linesInTitleBand,
})
textInsideGuide({
  required List<OcrLine> lines,
  required double guideLeft,
  required double guideTop,
  required double guideWidth,
  required double guideHeight,
  double inflateFraction = 0.02,
  double titleBandFraction = kCardTitleBandFraction,
}) {
  final marginX = guideWidth * inflateFraction;
  final marginY = guideHeight * inflateFraction;
  final left = guideLeft - marginX;
  final top = guideTop - marginY;
  final right = guideLeft + guideWidth + marginX;
  final bottom = guideTop + guideHeight + marginY;
  final titleBottom = guideTop + guideHeight * titleBandFraction;

  final inGuide = <OcrLine>[];
  for (final line in lines) {
    final cx = (line.left + line.right) / 2;
    final cy = (line.top + line.bottom) / 2;
    if (cx >= left && cx <= right && cy >= top && cy <= bottom) {
      inGuide.add(line);
    }
  }

  // Reading order so token matching behaves like full-frame `result.text`.
  inGuide.sort((a, b) {
    final dy = a.top.compareTo(b.top);
    return dy != 0 ? dy : a.left.compareTo(b.left);
  });

  final titleBand = [
    for (final line in inGuide)
      if ((line.top + line.bottom) / 2 < titleBottom) line,
  ];

  return (
    titleBandText: titleBand.map((l) => l.text).join('\n'),
    guideText: inGuide.map((l) => l.text).join('\n'),
    linesInGuide: inGuide.length,
    linesInTitleBand: titleBand.length,
  );
}
