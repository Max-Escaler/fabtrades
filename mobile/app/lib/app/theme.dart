import 'package:flutter/cupertino.dart' show CupertinoPageTransitionsBuilder;
import 'package:flutter/foundation.dart' show defaultTargetPlatform;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

/// Central theme for FAB Trades — a warm, earthy look matching fabtrades.net:
/// saddle-brown primary with a tan/gold accent on a cream canvas (light-first),
/// plus a cozy dark-brown variant.
class AppTheme {
  // ── FAB brand palette (mirrors fabtrades.net) ──────────────────────────
  /// Saddle brown — the signature FAB brand color (app bar, primary actions).
  static const brown = Color(0xFF8B4513);
  static const brownBright = Color(0xFFA0643F);
  static const brownDeep = Color(0xFF5D2F0D);

  /// Tan / soft gold — the complementary accent (borders, highlights).
  static const tan = Color(0xFFD4A574);
  static const tanBright = Color(0xFFE4C09C);
  static const tanDeep = Color(0xFFA8824E);

  /// Cream canvas used across the light theme.
  static const cream = Color(0xFFF5F1ED);

  /// Deep espresso canvas used across the dark theme.
  static const espresso = Color(0xFF2C1810);
  static const espressoDeep = Color(0xFF1A0F0A);

  // Kept for backwards-compat with existing references.
  static const seed = brown;

  // Semantic colors for trade deltas / have vs want.
  static const positive = Color(0xFF2E7D32); // in your favor / owned (green)
  static const negative = Color(0xFFC62828); // against you (red)
  static const haveAccent = positive;
  static const wantAccent = brown;

  static ThemeData light() => _base(Brightness.light);
  static ThemeData dark() => _base(Brightness.dark);

  // ── Color schemes ──────────────────────────────────────────────────────
  static ColorScheme _darkScheme() {
    final base =
        ColorScheme.fromSeed(seedColor: brown, brightness: Brightness.dark);
    return base.copyWith(
      primary: tanBright,
      onPrimary: espresso,
      primaryContainer: const Color(0xFF4A2E1A),
      onPrimaryContainer: tanBright,
      secondary: tan,
      onSecondary: espresso,
      secondaryContainer: const Color(0xFF4A3B22),
      onSecondaryContainer: tanBright,
      tertiary: brownBright,
      onTertiary: Colors.white,
      tertiaryContainer: const Color(0xFF4A2E1A),
      onTertiaryContainer: tanBright,
      error: negative,
      onError: Colors.white,
      surface: espresso,
      onSurface: const Color(0xFFF5EDE3),
      onSurfaceVariant: const Color(0xFFC6AE97),
      surfaceContainerLowest: espressoDeep,
      surfaceContainerLow: const Color(0xFF241812),
      surfaceContainer: const Color(0xFF2C1810),
      surfaceContainerHigh: const Color(0xFF382318),
      surfaceContainerHighest: const Color(0xFF45301F),
      outline: const Color(0xFF6E5442),
      outlineVariant: const Color(0xFF3E2C1F),
    );
  }

  static ColorScheme _lightScheme() {
    final base =
        ColorScheme.fromSeed(seedColor: brown, brightness: Brightness.light);
    return base.copyWith(
      primary: brown,
      onPrimary: Colors.white,
      primaryContainer: const Color(0xFFF4E3D3),
      onPrimaryContainer: const Color(0xFF3A1D08),
      secondary: tanDeep,
      onSecondary: Colors.white,
      secondaryContainer: const Color(0xFFF4E6C0),
      onSecondaryContainer: const Color(0xFF3B2E06),
      tertiary: brownBright,
      onTertiary: Colors.white,
      tertiaryContainer: const Color(0xFFF4E3D3),
      onTertiaryContainer: const Color(0xFF3A1D08),
      error: negative,
      onError: Colors.white,
      surface: Colors.white,
      onSurface: const Color(0xFF2C1810),
      onSurfaceVariant: const Color(0xFF6B4A2E),
      surfaceContainerLowest: Colors.white,
      surfaceContainerLow: const Color(0xFFFBF7F2),
      surfaceContainer: cream,
      surfaceContainerHigh: const Color(0xFFEFE7DE),
      surfaceContainerHighest: const Color(0xFFE9DFD3),
      outline: const Color(0xFFC9B49E),
      outlineVariant: const Color(0xFFE4D8C9),
    );
  }

  static ThemeData _base(Brightness brightness) {
    final isDark = brightness == Brightness.dark;
    final scheme = isDark ? _darkScheme() : _lightScheme();

    final scaffoldBg = isDark ? espressoDeep : cream;

    // App bar mirrors the site's brown gradient header with a tan underline.
    final appBarBg = isDark ? espresso : brown;
    const appBarFg = Colors.white;

    // Modern typography via Outfit (matches the web app; falls back to system).
    final baseText = GoogleFonts.outfitTextTheme(
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
        backgroundColor: appBarBg,
        surfaceTintColor: Colors.transparent,
        foregroundColor: appBarFg,
        elevation: 0,
        scrolledUnderElevation: 0,
        // Tan underline echoing the web header's 3px accent border.
        shape: const Border(bottom: BorderSide(color: tan, width: 3)),
        systemOverlayStyle: SystemUiOverlayStyle.light,
        iconTheme: const IconThemeData(color: appBarFg),
        titleTextStyle: textTheme.titleLarge?.copyWith(
          fontSize: 22,
          fontWeight: FontWeight.w800,
          color: appBarFg,
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
      return const Color(0xFF0277BD); // blue
    case 'super rare':
      return const Color(0xFF2E7D32); // green
    case 'majestic':
      return const Color(0xFFF57C00); // orange
    case 'legendary':
      return const Color(0xFF7E57C2); // purple
    case 'fabled':
      return const Color(0xFFC2185B); // magenta
    case 'marvel':
      return AppTheme.tanBright;
    case 'promo':
      return AppTheme.brownBright;
    default:
      return scheme.outline;
  }
}
