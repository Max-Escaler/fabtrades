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

/// Derives a pseudo title band when no OCR line landed inside the on-screen
/// guide — the full-frame fallback path. Takes the union bounding box of every
/// detected [lines] and reuses [textInsideGuide] so the top
/// [kCardTitleBandFraction] of that extent stands in for the card's printed
/// name. Without this, full-frame OCR has no positional signal and a token
/// mentioned only in rules text ("Create a Runechant token…") can win the
/// match. Returns empty strings when [lines] is empty.
///
/// Unlike the on-screen guide, this box is only as tall as the text actually
/// found, so the fixed fraction can land entirely above the first line's
/// centre and yield an empty band — always so for a lone line, whose centre
/// sits at half its own height. An empty band gates every token out of this
/// tier, including a token card that genuinely is being scanned, so the band
/// is widened to reach the topmost line when it would otherwise come back
/// empty. That line is the best available guess at the printed name.
({
  String titleBandText,
  String guideText,
  int linesInGuide,
  int linesInTitleBand,
})
textInsideDetectedBounds(
  List<OcrLine> lines, {
  double titleBandFraction = kCardTitleBandFraction,
}) {
  if (lines.isEmpty) {
    return (
      titleBandText: '',
      guideText: '',
      linesInGuide: 0,
      linesInTitleBand: 0,
    );
  }

  var left = lines.first.left;
  var top = lines.first.top;
  var right = lines.first.right;
  var bottom = lines.first.bottom;
  for (final line in lines) {
    if (line.left < left) left = line.left;
    if (line.top < top) top = line.top;
    if (line.right > right) right = line.right;
    if (line.bottom > bottom) bottom = line.bottom;
  }

  final height = bottom - top;
  final band = textInsideGuide(
    lines: lines,
    guideLeft: left,
    guideTop: top,
    guideWidth: right - left,
    guideHeight: height,
    titleBandFraction: titleBandFraction,
  );
  if (band.linesInTitleBand > 0) return band;

  var topmostCentre = double.infinity;
  for (final line in lines) {
    final cy = (line.top + line.bottom) / 2;
    if (cy < topmostCentre) topmostCentre = cy;
  }
  // Epsilon so the comparison in textInsideGuide is strictly greater.
  final reachTopmost =
      height <= 0 ? 1.0 : (topmostCentre - top) / height + 0.001;

  return textInsideGuide(
    lines: lines,
    guideLeft: left,
    guideTop: top,
    guideWidth: right - left,
    guideHeight: height,
    titleBandFraction: reachTopmost,
  );
}
