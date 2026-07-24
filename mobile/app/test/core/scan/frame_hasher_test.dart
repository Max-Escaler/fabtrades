import 'dart:math' as math;
import 'dart:typed_data';

import 'package:camera/camera.dart';
import 'package:camera_platform_interface/camera_platform_interface.dart';
import 'package:fabtrades/core/scan/frame_hasher.dart';
import 'package:fabtrades/core/scan/phash.dart';
import 'package:flutter_test/flutter_test.dart';

/// A deterministic smooth synthetic "card": a sum of low-frequency sinusoids,
/// evaluated at normalized coordinates so it can be rendered at any size.
/// (Same construction as phash_test.dart.)
double Function(double u, double v) _synthCard(int seed) {
  final rng = math.Random(seed);
  final components = List.generate(8, (_) {
    return (
      fu: rng.nextDouble() * 6,
      fv: rng.nextDouble() * 6,
      phase: rng.nextDouble() * 2 * math.pi,
      amp: rng.nextDouble(),
    );
  });
  return (u, v) {
    var s = 0.0;
    for (final c in components) {
      s += c.amp * math.sin(2 * math.pi * (c.fu * u + c.fv * v) + c.phase);
    }
    return 128 + 25 * s;
  };
}

/// The card guide rectangle for an upright frame of [width]×[height], using
/// the exact geometry contract shared with the scan screen / frame hasher.
({double left, double top, double width, double height}) _guideRect(
    int width, int height) {
  final w = width.toDouble(), h = height.toDouble();
  double visW, visH;
  if (w / h > kViewportAspect) {
    visH = h;
    visW = h * kViewportAspect;
  } else {
    visW = w;
    visH = w / kViewportAspect;
  }
  var guideW = kGuideWidthFraction * visW;
  var guideH = guideW / kCardAspect;
  final maxH = kGuideMaxHeightFraction * visH;
  if (guideH > maxH) {
    guideH = maxH;
    guideW = guideH * kCardAspect;
  }
  return (
    left: (w - guideW) / 2,
    top: (h - guideH) / 2,
    width: guideW,
    height: guideH,
  );
}

/// Builds an already-upright iOS-style BGRA8888 [CameraImage] with the synth
/// card drawn exactly in the guide rectangle on a dark background.
/// [rowPadding] simulates CoreVideo's row alignment (bytesPerRow > width*4).
CameraImage _iosFrame(
  double Function(double u, double v) card, {
  int width = 480,
  int height = 640,
  int rowPadding = 0,
}) {
  final guide = _guideRect(width, height);
  final stride = width * 4 + rowPadding;
  final bytes = Uint8List(stride * height);
  for (var y = 0; y < height; y++) {
    for (var x = 0; x < width; x++) {
      final u = (x + 0.5 - guide.left) / guide.width;
      final v = (y + 0.5 - guide.top) / guide.height;
      final inGuide = u >= 0 && u < 1 && v >= 0 && v < 1;
      final luma = (inGuide ? card(u, v) : 20.0).clamp(0.0, 255.0).round();
      final o = y * stride + x * 4;
      bytes[o] = luma; // B
      bytes[o + 1] = luma; // G
      bytes[o + 2] = luma; // R
      bytes[o + 3] = 255; // A
    }
  }
  return CameraImage.fromPlatformInterface(CameraImageData(
    width: width,
    height: height,
    // kCVPixelFormatType_32BGRA
    format: const CameraImageFormat(ImageFormatGroup.bgra8888,
        raw: 1111970369),
    planes: [
      CameraImagePlane(
        bytes: bytes,
        bytesPerRow: stride,
        width: width,
        height: height,
      ),
    ],
  ));
}

void main() {
  final card = _synthCard(7);
  // Reference hash of the same card, computed the way the catalog generator
  // does (upright image, standard edge trim).
  final refHash = phashOfImage(
    width: 315,
    height: 440,
    lumaAt: (x, y) => card((x + 0.5) / 315, (y + 0.5) / 440),
  );

  test('upright iOS BGRA frame matches the catalog hash with rotation 0', () {
    final hash = hashCameraFrame(_iosFrame(card), 0);
    expect(hash, isNotNull);
    final dist = hammingDistance(hash!, refHash);
    expect(dist, lessThan(40),
        reason: 'upright frame hashed with rotation 0 should be close to the '
            'catalog reference (got hamming distance $dist)');
  });

  test(
      'regression: rotating an already-upright iOS frame by the sensor '
      'orientation destroys the match', () {
    // The scan screen used to pass sensorOrientation (90) on iOS even though
    // camera_avfoundation streams buffers already rotated upright; the hash
    // then sampled a sideways region and could never match.
    final frame = _iosFrame(card);
    final wrong = hashCameraFrame(frame, 90);
    final right = hashCameraFrame(frame, 0);
    expect(wrong, isNotNull);
    expect(right, isNotNull);
    final wrongDist = hammingDistance(wrong!, refHash);
    final rightDist = hammingDistance(right!, refHash);
    expect(wrongDist, greaterThan(80),
        reason: 'a 90°-misrotated crop must not resemble the reference '
            '(got hamming distance $wrongDist)');
    expect(rightDist, lessThan(wrongDist - 40),
        reason: 'rotation 0 ($rightDist) should beat rotation 90 '
            '($wrongDist) by a wide margin');
  });

  test('padded bytesPerRow (CoreVideo row alignment) does not skew the hash',
      () {
    final plain = hashCameraFrame(_iosFrame(card), 0);
    final padded = hashCameraFrame(_iosFrame(card, rowPadding: 64), 0);
    expect(plain, isNotNull);
    expect(padded, isNotNull);
    expect(hammingDistance(plain!, padded!), 0);
  });
}
