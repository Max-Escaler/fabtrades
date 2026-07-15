import 'dart:typed_data';

import 'package:camera/camera.dart';

import 'phash.dart';

/// Turns live camera frames into perceptual hashes of the card inside the
/// on-screen guide rectangle, ready to match against [CardHashIndex].
///
/// Geometry contract with the scan screen UI (kept in one place so the overlay
/// and the sampling can never drift apart):
///  - The preview is rendered with BoxFit.cover inside a viewport of
///    [kViewportAspect] (width/height).
///  - The card guide is centered in that viewport, [kGuideWidthFraction] of
///    the *visible* preview width wide, with the physical card aspect
///    [kCardAspect] (clamped to [kGuideMaxHeightFraction] of the height).

/// Width / height of the camera viewport box in the UI.
const double kViewportAspect = 3 / 4;

/// Guide width as a fraction of the visible preview width.
const double kGuideWidthFraction = 0.72;

/// Cap on guide height as a fraction of the visible preview height.
const double kGuideMaxHeightFraction = 0.92;

/// Physical trading-card aspect ratio (63 mm × 88 mm).
const double kCardAspect = 63 / 88;

/// Computes the pHash of the guide-rect region of a streamed camera frame, or
/// null when the frame format isn't usable. [rotationDegrees] is the clockwise
/// rotation that turns the raw sensor frame into the upright displayed image
/// (the same value the screen computes for ML Kit).
Uint8List? hashCameraFrame(CameraImage image, int rotationDegrees) {
  final lumaAt = _lumaSampler(image);
  if (lumaAt == null) return null;

  final rawW = image.width, rawH = image.height;
  final swap = rotationDegrees == 90 || rotationDegrees == 270;
  final rotatedW = (swap ? rawH : rawW).toDouble();
  final rotatedH = (swap ? rawW : rawH).toDouble();

  // Region of the rotated frame visible after BoxFit.cover into the viewport.
  double visW, visH;
  if (rotatedW / rotatedH > kViewportAspect) {
    visH = rotatedH;
    visW = rotatedH * kViewportAspect;
  } else {
    visW = rotatedW;
    visH = rotatedW / kViewportAspect;
  }

  // The card guide, centered in the visible region.
  var guideW = kGuideWidthFraction * visW;
  var guideH = guideW / kCardAspect;
  final maxH = kGuideMaxHeightFraction * visH;
  if (guideH > maxH) {
    guideH = maxH;
    guideW = guideH * kCardAspect;
  }
  var left = (rotatedW - guideW) / 2;
  var top = (rotatedH - guideH) / 2;

  // Same edge trim as the catalog hashes (border / background sliver).
  left += guideW * kCardInsetFraction;
  top += guideH * kCardInsetFraction;
  final width = guideW * (1 - 2 * kCardInsetFraction);
  final height = guideH * (1 - 2 * kCardInsetFraction);

  final grid = sampleLumaGrid(
    rawWidth: rawW,
    rawHeight: rawH,
    lumaAt: lumaAt,
    rotationDegrees: rotationDegrees,
    left: left,
    top: top,
    width: width,
    height: height,
  );
  return phashFromLuma(grid);
}

/// Luminance accessor for the two stream formats the scanner requests:
/// NV21 (Android — plane 0 is the Y/luma plane) and BGRA8888 (iOS).
double Function(int x, int y)? _lumaSampler(CameraImage image) {
  if (image.planes.isEmpty) return null;
  final plane = image.planes.first;
  final bytes = plane.bytes;
  final stride = plane.bytesPerRow;

  switch (image.format.group) {
    case ImageFormatGroup.nv21:
    case ImageFormatGroup.yuv420:
      return (x, y) => bytes[y * stride + x].toDouble();
    case ImageFormatGroup.bgra8888:
      return (x, y) {
        final o = y * stride + x * 4;
        return 0.114 * bytes[o] + 0.587 * bytes[o + 1] + 0.299 * bytes[o + 2];
      };
    default:
      return null;
  }
}
