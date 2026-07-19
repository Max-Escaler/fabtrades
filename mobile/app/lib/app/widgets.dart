import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../core/data/set_logo_cache.dart';
import '../core/models/card_model.dart';
import 'theme.dart';

/// Official FAB set logo for browse lists. Falls back to [setName] when the
/// logo URL is missing or fails to load (mirrors the web Browse Sets page).
///
/// Once decoded, frames are retained in [SetLogoCache] and painted with
/// [RawImage] so rows that remount after a set drill-in (or Settings) do not
/// unload/reload. First load uses [Image] + [CachedNetworkImageProvider].
///
/// When [alwaysShowName] is true (Silver Age chapters share one logo), the set
/// name stays visible beside the logo. [abbreviation] is shown when non-empty.
class SetLogoTitle extends StatefulWidget {
  const SetLogoTitle({
    super.key,
    required this.setName,
    this.logoUrl,
    this.abbreviation,
    this.alwaysShowName = false,
    this.height = SetLogoCache.defaultHeight,
    @visibleForTesting this.debugImageProvider,
  });

  final String setName;
  final String? logoUrl;
  final String? abbreviation;
  final bool alwaysShowName;
  final double height;

  /// Test seam: inject a local [ImageProvider] instead of hitting the CDN.
  @visibleForTesting
  final ImageProvider? debugImageProvider;

  /// URLs that have painted or been memory-precached this process. Once warm,
  /// we never flash the set-name placeholder on a transient cache miss.
  static final Set<String> _warmUrls = <String>{};

  /// Mark [url] as already shown so placeholders stay quiet across rebuilds
  /// and route pops (also used by [SetLogoCache.precacheIntoMemory]).
  static void markWarm(String url) {
    if (url.isNotEmpty) _warmUrls.add(url);
  }

  @visibleForTesting
  static bool debugIsWarm(String url) => _warmUrls.contains(url);

  @visibleForTesting
  static void debugResetWarmUrls() => _warmUrls.clear();

  @override
  State<SetLogoTitle> createState() => _SetLogoTitleState();
}

class _SetLogoTitleState extends State<SetLogoTitle> {
  /// Last successfully painted logo chrome. Kept across rebuilds so a brief
  /// [frame] == null (common after set drill-in / Settings pop) does not
  /// blank the row while the provider reattaches.
  Widget? _stableLogo;

  /// True once this row has painted a logo frame (triggers rebuild so set-code
  /// / Silver Age name meta can sit beside the logo).
  bool _logoReady = false;

  String get _abbreviation => (widget.abbreviation ?? '').trim();

  void _markLogoReady() {
    if (_logoReady || !mounted) return;
    setState(() => _logoReady = true);
  }

  Widget _nameFallback(ColorScheme scheme) {
    final abbr = _abbreviation;
    if (abbr.isEmpty) {
      return Text(
        widget.setName,
        style: const TextStyle(fontWeight: FontWeight.w600),
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      );
    }
    return Row(
      children: [
        Flexible(
          child: Text(
            widget.setName,
            style: const TextStyle(fontWeight: FontWeight.w600),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ),
        const SizedBox(width: 8),
        Text(
          abbr,
          style: TextStyle(
            fontWeight: FontWeight.w500,
            fontSize: 13,
            color: scheme.onSurfaceVariant,
          ),
        ),
      ],
    );
  }

  Widget _withMeta({
    required Widget logo,
    required ColorScheme scheme,
  }) {
    final abbr = _abbreviation;
    final showName = widget.alwaysShowName;
    if (!showName && abbr.isEmpty) return logo;

    return Row(
      children: [
        Flexible(child: logo),
        const SizedBox(width: 10),
        if (showName)
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  widget.setName,
                  style: const TextStyle(fontWeight: FontWeight.w600),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                if (abbr.isNotEmpty)
                  Text(
                    abbr,
                    style: TextStyle(
                      fontWeight: FontWeight.w500,
                      fontSize: 12,
                      color: scheme.onSurfaceVariant,
                    ),
                  ),
              ],
            ),
          )
        else
          Text(
            abbr,
            style: TextStyle(
              fontWeight: FontWeight.w500,
              fontSize: 13,
              color: scheme.onSurfaceVariant,
            ),
          ),
      ],
    );
  }

  Widget _constrainedLogo({
    required double plateHeight,
    required Widget child,
  }) {
    return Align(
      alignment: Alignment.centerLeft,
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxHeight: plateHeight,
          maxWidth: widget.alwaysShowName ? 160 : 280,
        ),
        child: child,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final url = widget.logoUrl;
    final scheme = Theme.of(context).colorScheme;
    if (url == null || url.isEmpty) {
      return _nameFallback(scheme);
    }

    final isDark = Theme.of(context).brightness == Brightness.dark;
    final alreadyWarm = SetLogoTitle._warmUrls.contains(url);
    final dpr = MediaQuery.devicePixelRatioOf(context);
    final height = widget.height;
    final plateHeight = height + SetLogoCache.platePadding;
    final memCacheHeight = SetLogoCache.memCacheHeightFor(height, dpr);
    final nameFallback = _nameFallback(scheme);

    // Instant paint after set drill-in remounts the browse row.
    final retained = SetLogoCache.imageFor(url);
    if (retained != null) {
      SetLogoTitle.markWarm(url);
      return _withMeta(
        scheme: scheme,
        logo: _constrainedLogo(
          plateHeight: plateHeight,
          child: _logoChrome(
            plateHeight: plateHeight,
            isDark: isDark,
            scheme: scheme,
            child: RawImage(
              image: retained,
              height: height,
              fit: BoxFit.contain,
              alignment: Alignment.centerLeft,
            ),
          ),
        ),
      );
    }

    final imageProvider = widget.debugImageProvider ??
        SetLogoCache.providerFor(url, memCacheHeight: memCacheHeight);

    final logoImage = _constrainedLogo(
      plateHeight: plateHeight,
      child: Image(
        image: imageProvider,
        height: height,
        fit: BoxFit.contain,
        alignment: Alignment.centerLeft,
        // Keep the last frame visible while the provider re-resolves after
        // ImageCache pressure or Navigator pop (set detail / Settings).
        gaplessPlayback: true,
        frameBuilder: (context, child, frame, wasSynchronouslyLoaded) {
          if (frame != null || wasSynchronouslyLoaded) {
            SetLogoTitle.markWarm(url);
            if (child is RawImage && child.image != null) {
              SetLogoCache.retain(url, child.image!);
            }
            SetLogoCache.ensurePinned(url, imageProvider, context);
            final painted = _logoChrome(
              plateHeight: plateHeight,
              isDark: isDark,
              scheme: scheme,
              child: child,
            );
            _stableLogo = painted;
            if (!_logoReady) {
              WidgetsBinding.instance.addPostFrameCallback((_) {
                _markLogoReady();
              });
            }
            return painted;
          }
          if (_stableLogo != null) return _stableLogo!;
          if (alreadyWarm) {
            // Quiet hold — never swap back to the set name once warm.
            return _logoChrome(
              plateHeight: plateHeight,
              isDark: isDark,
              scheme: scheme,
              child: child,
            );
          }
          return const SizedBox.shrink();
        },
        errorBuilder: (_, _, _) => nameFallback,
      ),
    );

    final showLogo = _logoReady || alreadyWarm;
    if (!showLogo) {
      // Keep the Image mounted (offstage) so the first frame can arrive, while
      // the visible row shows the set name — same cold-load behavior as before.
      return Stack(
        alignment: Alignment.centerLeft,
        children: [
          Offstage(child: logoImage),
          nameFallback,
        ],
      );
    }

    return _withMeta(scheme: scheme, logo: logoImage);
  }

  static Widget _logoChrome({
    required double plateHeight,
    required bool isDark,
    required ColorScheme scheme,
    required Widget child,
  }) {
    return Container(
      height: plateHeight,
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
      decoration: BoxDecoration(
        color: isDark
            ? Colors.white.withValues(alpha: 0.06)
            : scheme.onSurface.withValues(alpha: 0.04),
        borderRadius: BorderRadius.circular(6),
      ),
      child: child,
    );
  }
}

/// Rounded card artwork with graceful placeholders.
class CardThumbnail extends StatelessWidget {
  const CardThumbnail({
    super.key,
    required this.url,
    this.width = 46,
    this.height = 64,
    this.radius = 8,
    this.foil = false,
  });

  final String? url;
  final double width;
  final double height;
  final double radius;
  final bool foil;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    Widget child;
    if (url == null || url!.isEmpty) {
      child = Container(
        width: width,
        height: height,
        color: scheme.surfaceContainerHighest,
        child: Icon(Icons.image_not_supported_outlined,
            size: width * 0.4, color: scheme.outline),
      );
    } else {
      child = CachedNetworkImage(
        imageUrl: url!,
        width: width,
        height: height,
        fit: BoxFit.cover,
        placeholder: (_, _) => Container(
          width: width,
          height: height,
          color: scheme.surfaceContainerHighest,
        ),
        errorWidget: (_, _, _) => Container(
          width: width,
          height: height,
          color: scheme.surfaceContainerHighest,
          child: Icon(Icons.broken_image_outlined,
              size: width * 0.4, color: scheme.outline),
        ),
      );
    }
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(radius),
        border: foil
            ? Border.all(color: const Color(0xFFB794F6), width: 1.5)
            : Border.all(color: scheme.outlineVariant, width: 0.5),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(radius),
        child: child,
      ),
    );
  }
}

/// Small rounded pill (foil / rarity / set etc.).
class PillBadge extends StatelessWidget {
  const PillBadge({
    super.key,
    required this.label,
    required this.color,
    this.filled = false,
    this.icon,
  });

  final String label;
  final Color color;
  final bool filled;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: icon != null ? 6 : 7, vertical: 2),
      decoration: BoxDecoration(
        color: filled ? color : color.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon,
                size: 11, color: filled ? Colors.white : color),
            const SizedBox(width: 3),
          ],
          Text(
            label,
            style: TextStyle(
              fontSize: 10.5,
              height: 1.1,
              fontWeight: FontWeight.w700,
              color: filled ? Colors.white : color,
            ),
          ),
        ],
      ),
    );
  }
}

/// Rarity badge convenience.
class RarityBadge extends StatelessWidget {
  const RarityBadge({super.key, required this.rarity});
  final String? rarity;

  @override
  Widget build(BuildContext context) {
    if (rarity == null || rarity!.isEmpty || rarity == 'None') {
      return const SizedBox.shrink();
    }
    final scheme = Theme.of(context).colorScheme;
    return PillBadge(label: rarity!, color: rarityColor(rarity, scheme));
  }
}

/// Reusable list row for a card printing (used in search, picker, results).
class CardRow extends StatelessWidget {
  const CardRow({
    super.key,
    required this.card,
    required this.priceLabel,
    this.secondaryLabel,
    this.priceSource,
    this.onTap,
    this.onAdd,
    this.trailing,
    this.showThumbnail = true,
    this.inlineBadges = false,
  });

  final CardModel card;
  final String priceLabel;
  final String? secondaryLabel;

  /// When false, the card art thumbnail is omitted entirely (and never
  /// requested from the network). Browse uses this so art only loads on the
  /// card detail page.
  final bool showThumbnail;

  /// When true, the rarity/foil chips sit inline with the set • #number meta
  /// line instead of on their own row below it (used by the browse list).
  final bool inlineBadges;

  /// When set, a small marketplace attribution (e.g. "TCGplayer") is shown
  /// beneath the price so the source of the number is always clear.
  final String? priceSource;
  final VoidCallback? onTap;
  final VoidCallback? onAdd;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        child: Row(
          children: [
            if (showThumbnail) ...[
              CardThumbnail(url: card.imageUrl, foil: card.isFoil),
              const SizedBox(width: 12),
            ],
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(card.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          fontSize: 15, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 3),
                  if (inlineBadges)
                    Wrap(
                      spacing: 6,
                      runSpacing: 4,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        CardMetaLine(card: card),
                        RarityBadge(rarity: card.rarity),
                        if (card.isFoil)
                          const PillBadge(
                              label: 'FOIL',
                              color: Color(0xFF9B5DE5),
                              icon: Icons.auto_awesome),
                      ],
                    )
                  else ...[
                    CardMetaLine(card: card),
                    const SizedBox(height: 5),
                    Row(
                      children: [
                        RarityBadge(rarity: card.rarity),
                        if (card.isFoil) ...[
                          const SizedBox(width: 5),
                          const PillBadge(
                              label: 'FOIL',
                              color: Color(0xFF9B5DE5),
                              icon: Icons.auto_awesome),
                        ],
                      ],
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(width: 8),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(priceLabel,
                    style: theme.textTheme.titleMedium
                        ?.copyWith(fontWeight: FontWeight.w800)),
                if (secondaryLabel != null)
                  Text(secondaryLabel!,
                      style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant)),
                if (priceSource != null) ...[
                  const SizedBox(height: 2),
                  PriceSourceTag(source: priceSource!),
                ],
              ],
            ),
            if (trailing != null) ...[const SizedBox(width: 4), trailing!],
            if (trailing == null && onAdd != null)
              IconButton(
                icon: const Icon(Icons.add_circle_outline),
                color: theme.colorScheme.primary,
                onPressed: onAdd,
              ),
          ],
        ),
      ),
    );
  }
}

/// An in-list "Add …" row (used instead of a FAB), matching the trade screen's
/// inline add affordance.
class AddListRow extends StatelessWidget {
  const AddListRow({
    super.key,
    required this.label,
    required this.onTap,
    this.icon = Icons.add,
  });

  final String label;
  final VoidCallback onTap;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
        child: Row(
          children: [
            Icon(icon, size: 20, color: theme.colorScheme.primary),
            const SizedBox(width: 8),
            Text(
              label,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.primary,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Tiny, muted price-source attribution (e.g. a storefront glyph + "TCGplayer")
/// shown beside/under a price so users always know where the number comes from.
class PriceSourceTag extends StatelessWidget {
  const PriceSourceTag({super.key, required this.source});
  final String source;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(Icons.storefront_outlined, size: 11, color: scheme.onSurfaceVariant),
        const SizedBox(width: 3),
        Text(
          source,
          style: TextStyle(
            fontSize: 10,
            height: 1.1,
            fontWeight: FontWeight.w600,
            color: scheme.onSurfaceVariant,
          ),
        ),
      ],
    );
  }
}

/// A pill badge crediting the marketplace a price comes from, for use in more
/// prominent spots such as the card detail price card header.
class PriceSourceBadge extends StatelessWidget {
  const PriceSourceBadge({super.key, required this.source});
  final String source;

  @override
  Widget build(BuildContext context) {
    return PillBadge(
      label: source,
      color: AppTheme.seed,
      icon: Icons.storefront_outlined,
    );
  }
}

/// Compact metadata row (set • #number) used under card names.
class CardMetaLine extends StatelessWidget {
  const CardMetaLine({super.key, required this.card, this.style});
  final CardModel card;
  final TextStyle? style;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final s = style ??
        theme.textTheme.bodySmall
            ?.copyWith(color: theme.colorScheme.onSurfaceVariant);
    final parts = <String>[
      if (card.setName != null) card.setName!,
      if (card.collectorNumber != null) '#${card.collectorNumber}',
    ];
    return Text(parts.join('  •  '),
        maxLines: 1, overflow: TextOverflow.ellipsis, style: s);
  }
}
