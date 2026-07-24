import 'dart:typed_data';

import 'package:camera/camera.dart';

import 'phash.dart';
import 'rectify.dart';

// The viewport / guide geometry constants live in the pure phash.dart module;
// re-export them so existing importers of this file (e.g. the scan screen) are
// unaffected.
export 'phash.dart'
    show
        kViewportAspect,
        kGuideWidthFraction,
        kGuideMaxHeightFraction,
        kCardAspect,
        kGraySide;

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

/// Computes the pHash of the guide-rect region of a streamed camera frame, or
/// null when the frame format isn't usable. [rotationDegrees] is the clockwise
/// rotation that turns the raw sensor frame into the upright displayed image
/// (the same value the screen computes for ML Kit).
///
/// [onGrid] (when set) receives the [kGraySide]² luma grid that was actually
/// hashed — the scan screen's diagnostics overlay renders it so sampling
/// geometry can be verified on-device.
Uint8List? hashCameraFrame(CameraImage image, int rotationDegrees,
    {void Function(Float64List grid)? onGrid}) {
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
  final left = (rotatedW - guideW) / 2;
  final top = (rotatedH - guideH) / 2;

  // Prefer the card's actual outline: find its four edges inside (and a little
  // beyond) the guide and sample that quad, recovering offset, scale and modest
  // tilt so the hash lines up with the flat catalog scans. Fall back to the
  // fixed guide crop when detection isn't confident, so this never regresses
  // the previous behaviour.
  final quad = detectCardQuad(
    rawWidth: rawW,
    rawHeight: rawH,
    lumaAt: lumaAt,
    rotationDegrees: rotationDegrees,
    rotatedWidth: rotatedW,
    rotatedHeight: rotatedH,
    guideLeft: left,
    guideTop: top,
    guideWidth: guideW,
    guideHeight: guideH,
  );
  // Use the detected quad only when the card is meaningfully offset, scaled or
  // tilted; when it already fills the guide, the fixed crop is just as accurate
  // and steadier frame-to-frame.
  if (quad != null &&
      !quadMatchesGuide(quad, left, top, guideW, guideH)) {
    final quadGrid = sampleLumaQuad(
      rawWidth: rawW,
      rawHeight: rawH,
      lumaAt: lumaAt,
      rotationDegrees: rotationDegrees,
      quad: quad,
    );
    onGrid?.call(quadGrid);
    return phashFromLuma(quadGrid);
  }

  // Fallback: fixed guide crop with the same edge trim as the catalog hashes.
  final grid = sampleLumaGrid(
    rawWidth: rawW,
    rawHeight: rawH,
    lumaAt: lumaAt,
    rotationDegrees: rotationDegrees,
    left: left + guideW * kCardInsetFraction,
    top: top + guideH * kCardInsetFraction,
    width: guideW * (1 - 2 * kCardInsetFraction),
    height: guideH * (1 - 2 * kCardInsetFraction),
  );
  onGrid?.call(grid);
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
