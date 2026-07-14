import 'package:flutter/cupertino.dart' show CupertinoPageTransitionsBuilder;
import 'package:flutter/foundation.dart' show defaultTargetPlatform;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

/// Central theme for FAB Trades — a modern, Flesh and Blood-inspired look built
/// on a deep charcoal canvas with crimson and gold accents (dark-first) and a
/// clean crimson-and-gold light variant.
class AppTheme {
  // ── Flesh and Blood brand palette ──────────────────────────────────────
  /// Signature gold — the premium accent (buttons, highlights on dark).
  static const gold = Color(0xFFD9B14E);
  static const goldBright = Color(0xFFF0CE7A);
  static const goldDeep = Color(0xFFB2872C);

  /// FAB crimson — interactive/brand red.
  static const fabRed = Color(0xFFC1272D);
  static const fabRedBright = Color(0xFFE85C58);
  static const fabRedDeep = Color(0xFF8E1B1F);

  /// Deep charcoal canvas used across the dark theme.
  static const navy = Color(0xFF15100F);

  // Kept for backwards-compat with existing references.
  static const seed = fabRed;

  // Semantic colors for trade deltas / have vs want.
  static const positive = Color(0xFF35B87E); // in your favor / owned
  static const negative = Color(0xFFE5675E); // against you
  static const haveAccent = Color(0xFF35B87E);
  static const wantAccent = gold;

  static ThemeData light() => _base(Brightness.light);
  static ThemeData dark() => _base(Brightness.dark);

  // ── Color schemes ──────────────────────────────────────────────────────
  static ColorScheme _darkScheme() {
    final base =
        ColorScheme.fromSeed(seedColor: fabRed, brightness: Brightness.dark);
    return base.copyWith(
      primary: goldBright,
      onPrimary: const Color(0xFF2A2000),
      primaryContainer: const Color(0xFF4A3B10),
      onPrimaryContainer: goldBright,
      secondary: fabRedBright,
      onSecondary: const Color(0xFF032046),
      secondaryContainer: const Color(0xFF163457),
      onSecondaryContainer: const Color(0xFFD5E4FF),
      tertiary: goldBright,
      onTertiary: const Color(0xFF2A2000),
      tertiaryContainer: const Color(0xFF4A3B10),
      onTertiaryContainer: goldBright,
      error: negative,
      onError: const Color(0xFF3A0906),
      surface: const Color(0xFF0E1D31),
      onSurface: const Color(0xFFE7ECF4),
      onSurfaceVariant: const Color(0xFFA7B4C6),
      surfaceContainerLowest: const Color(0xFF081321),
      surfaceContainerLow: const Color(0xFF0E1D31),
      surfaceContainer: const Color(0xFF13253C),
      surfaceContainerHigh: const Color(0xFF1A2E48),
      surfaceContainerHighest: const Color(0xFF223755),
      outline: const Color(0xFF3B4D66),
      outlineVariant: const Color(0xFF283a52),
    );
  }

  static ColorScheme _lightScheme() {
    final base =
        ColorScheme.fromSeed(seedColor: fabRed, brightness: Brightness.light);
    return base.copyWith(
      primary: fabRedDeep,
      onPrimary: Colors.white,
      primaryContainer: const Color(0xFFD6E3F8),
      onPrimaryContainer: const Color(0xFF0A2444),
      secondary: goldDeep,
      onSecondary: Colors.white,
      secondaryContainer: const Color(0xFFF4E6C0),
      onSecondaryContainer: const Color(0xFF3B2E06),
      tertiary: goldDeep,
      onTertiary: Colors.white,
      tertiaryContainer: const Color(0xFFF4E6C0),
      onTertiaryContainer: const Color(0xFF3B2E06),
      error: negative,
      surface: Colors.white,
      onSurface: const Color(0xFF11202F),
      onSurfaceVariant: const Color(0xFF566476),
      surfaceContainerLowest: Colors.white,
      surfaceContainerLow: const Color(0xFFF4F7FB),
      surfaceContainer: const Color(0xFFEDF2F8),
      surfaceContainerHigh: const Color(0xFFE6EDF5),
      surfaceContainerHighest: const Color(0xFFDFE7F1),
      outline: const Color(0xFFAFBCCB),
      outlineVariant: const Color(0xFFD5DEE8),
    );
  }

  static ThemeData _base(Brightness brightness) {
    final isDark = brightness == Brightness.dark;
    final scheme = isDark ? _darkScheme() : _lightScheme();

    final scaffoldBg =
        isDark ? navy : const Color(0xFFEFF3F8);

    // Modern typography via Manrope (falls back to system if unavailable).
    final baseText = GoogleFonts.manropeTextTheme(
      isDark ? ThemeData.dark().textTheme : ThemeData.light().textTheme,
    ).apply(
      bodyColor: scheme.onSurface,
      displayColor: scheme.onSurface,
    );
    final textTheme = baseText.copyWith(
      headlineSmall: baseText.headlineSmall
          ?.copyWith(fontWeight: FontWeight.w800, letterSpacing: -0.4),
      titleLarge: baseText.titleLarge
          ?.copyWith(fontWeight: FontWeight.w800, letterSpacing: -0.3),
      titleMedium: baseText.titleMedium?.copyWith(fontWeight: FontWeight.w700),
      titleSmall: baseText.titleSmall?.copyWith(fontWeight: FontWeight.w700),
      labelLarge: baseText.labelLarge?.copyWith(fontWeight: FontWeight.w700),
    );

    // On iOS, center the nav-bar title to match the platform convention; keep
    // the left-aligned look everywhere else. Uses defaultTargetPlatform (no
    // BuildContext here), so Android/web/desktop are unaffected.
    final isIOS = defaultTargetPlatform == TargetPlatform.iOS;

    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      textTheme: textTheme,
      scaffoldBackgroundColor: scaffoldBg,
      // Platform-adaptive page transitions: Android gets the modern
      // predictive-back animation; iOS/macOS keep their native slide +
      // back-swipe gesture.
      pageTransitionsTheme: const PageTransitionsTheme(
        builders: {
          TargetPlatform.android: PredictiveBackPageTransitionsBuilder(),
          TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
          TargetPlatform.macOS: CupertinoPageTransitionsBuilder(),
        },
      ),
      appBarTheme: AppBarTheme(
        centerTitle: isIOS,
        backgroundColor: scaffoldBg,
        surfaceTintColor: Colors.transparent,
        foregroundColor: scheme.onSurface,
        elevation: 0,
        scrolledUnderElevation: 0,
        systemOverlayStyle:
            isDark ? SystemUiOverlayStyle.light : SystemUiOverlayStyle.dark,
        titleTextStyle: textTheme.titleLarge?.copyWith(
          fontSize: 22,
          fontWeight: FontWeight.w800,
          color: scheme.onSurface,
          letterSpacing: -0.4,
        ),
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        margin: EdgeInsets.zero,
        clipBehavior: Clip.antiAlias,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18),
          side: BorderSide(color: scheme.outlineVariant, width: 1),
        ),
        color: isDark ? scheme.surfaceContainer : Colors.white,
      ),
      dividerTheme: DividerThemeData(
        color: scheme.outlineVariant,
        thickness: 1,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor:
            isDark ? scheme.surfaceContainerHigh : Colors.white,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        hintStyle: TextStyle(color: scheme.onSurfaceVariant),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: scheme.outlineVariant, width: 1),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: scheme.primary, width: 1.6),
        ),
      ),
      chipTheme: ChipThemeData(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(10),
        ),
        side: BorderSide(color: scheme.outlineVariant),
        labelStyle: textTheme.labelLarge?.copyWith(fontSize: 13),
        backgroundColor: isDark ? scheme.surfaceContainerHigh : null,
        selectedColor: scheme.primaryContainer,
      ),
      navigationBarTheme: NavigationBarThemeData(
        height: 68,
        elevation: 0,
        backgroundColor: isDark ? scheme.surfaceContainerLow : Colors.white,
        surfaceTintColor: Colors.transparent,
        indicatorColor: scheme.primaryContainer,
        iconTheme: WidgetStateProperty.resolveWith(
          (states) => IconThemeData(
            color: states.contains(WidgetState.selected)
                ? scheme.onPrimaryContainer
                : scheme.onSurfaceVariant,
          ),
        ),
        labelTextStyle: WidgetStatePropertyAll(
          textTheme.labelMedium?.copyWith(fontWeight: FontWeight.w700),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          textStyle: textTheme.labelLarge?.copyWith(fontSize: 15),
        ),
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: scheme.surfaceContainerHighest,
        contentTextStyle: TextStyle(color: scheme.onSurface),
        shape:
            RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
    );
  }
}

/// Flesh and Blood rarity → accent color for badges.
Color rarityColor(String? rarity, ColorScheme scheme) {
  switch (rarity?.toLowerCase()) {
    case 'token':
    case 'basic':
      return scheme.outline;
    case 'common':
      return scheme.onSurfaceVariant;
    case 'rare':
      return const Color(0xFF5AA0E7); // blue
    case 'super rare':
      return const Color(0xFF35B87E); // green
    case 'majestic':
      return const Color(0xFFE0724D); // orange
    case 'legendary':
      return const Color(0xFFB07CF0); // purple
    case 'fabled':
      return const Color(0xFFE24BA6); // magenta
    case 'marvel':
      return AppTheme.goldBright;
    case 'promo':
      return AppTheme.gold;
    default:
      return scheme.outline;
  }
}
