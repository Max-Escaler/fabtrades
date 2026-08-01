import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/data/card_repository.dart';
import '../../core/models/card_model.dart';
import '../../core/providers.dart';
import 'life_tracker_models.dart';

/// A deduped hero option for the life-tracker picker.
class HeroOption {
  const HeroOption({
    required this.name,
    required this.life,
    this.imageUrl,
    this.isYoung = false,
    this.isClear = false,
  });

  /// Sentinel returned when the user picks "No hero (manual)".
  static const clear = HeroOption(
    name: '',
    life: 0,
    isClear: true,
  );

  final String name;
  final int life;
  final String? imageUrl;
  final bool isYoung;
  final bool isClear;
}

/// True when [card] is a real playable hero card (not a weapon/hero DFC token).
///
/// Catalog quirks this excludes:
/// - `Hero;Weapon` double-faced tokens named like `Anothos // Bravo`
/// - `Hero;Token` / `Hero;Macro` rows
bool isPlayableHeroCard(CardModel card) {
  final type = card.cardType;
  if (type == null || type.trim().isEmpty) return false;

  var hasHero = false;
  for (final part in type.split(';')) {
    final p = part.trim().toLowerCase();
    if (p == 'weapon' || p == 'token' || p == 'macro') return false;
    if (p == 'hero') hasHero = true;
  }
  if (!hasHero) return false;

  // Double-faced weapon//hero tokens slip through as Hero;Weapon above, but
  // also reject any remaining `//` names defensively.
  if (card.name.contains('//')) return false;

  return resolvedHeroLife(card) != null;
}

/// Starting life for a hero, correcting TCGplayer life/intellect swaps.
///
/// Upstream data sometimes stores intellect (typically 4) in `life` and the
/// real life total (20/40) in `intellect` — e.g. Aurora, Legacy of Tempest.
/// Heroes virtually never have life ≤ 10, so when that pattern appears we
/// take the intellect field instead.
int? resolvedHeroLife(CardModel card) {
  final life = int.tryParse(card.life ?? '');
  final intellect = int.tryParse(card.intellect ?? '');

  final lifeLooksLikeIntellect = life != null && life > 0 && life <= 10;
  final intellectLooksLikeLife =
      intellect != null && (intellect == 20 || intellect == 40 || intellect >= 15);

  if (lifeLooksLikeIntellect && intellectLooksLikeLife) {
    return intellect;
  }
  if (life != null && life > 0) return life;
  // Fall back when life is missing but intellect clearly holds a life total.
  if (intellectLooksLikeLife) return intellect;
  return null;
}

/// Young heroes are tagged with `Young` in semicolon-delimited [cardSubType].
bool isYoungHero(CardModel card) {
  final sub = card.cardSubType;
  if (sub == null || sub.trim().isEmpty) return false;
  for (final part in sub.split(';')) {
    if (part.trim().toLowerCase() == 'young') return true;
  }
  return false;
}

/// Whether [card] is legal for [format]:
/// - Classic Constructed → adult Heroes only (not Young)
/// - Silver Age → Young Heroes only
bool isHeroLegalForFormat(CardModel card, LifeFormat format) {
  final young = isYoungHero(card);
  return switch (format) {
    LifeFormat.cc => !young,
    LifeFormat.silverAge => young,
  };
}

/// Deduped, alphabetically sorted hero options for [format].
List<HeroOption> buildHeroOptions(
  List<CardModel> cards,
  LifeFormat format,
) {
  final byKey = <String, HeroOption>{};
  for (final card in cards) {
    if (!isPlayableHeroCard(card)) continue;
    if (!isHeroLegalForFormat(card, format)) continue;
    final life = resolvedHeroLife(card)!;
    final name = baseCardName(card.name);
    if (name.isEmpty) continue;
    final key = name.toLowerCase();
    final existing = byKey[key];
    if (existing == null) {
      byKey[key] = HeroOption(
        name: name,
        life: life,
        imageUrl: card.imageUrl,
        isYoung: isYoungHero(card),
      );
    } else {
      // Prefer a printing with art, and prefer a corrected/higher life if an
      // earlier printing still had swapped stats somehow.
      final preferLife = life > existing.life ? life : existing.life;
      final preferImage =
          (existing.imageUrl == null || existing.imageUrl!.isEmpty) &&
                  card.imageUrl != null &&
                  card.imageUrl!.isNotEmpty
              ? card.imageUrl
              : existing.imageUrl;
      byKey[key] = HeroOption(
        name: existing.name,
        life: preferLife,
        imageUrl: preferImage,
        isYoung: existing.isYoung,
      );
    }
  }
  final list = byKey.values.toList()
    ..sort((a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()));
  return list;
}

/// Deduped heroes legal for the given [format].
final heroOptionsProvider =
    Provider.family<AsyncValue<List<HeroOption>>, LifeFormat>((ref, format) {
  final catalog = ref.watch(catalogProvider);
  return catalog.whenData((cards) => buildHeroOptions(cards, format));
});

/// Shows a searchable hero picker filtered for [format].
///
/// Returns:
/// - `null` if dismissed without a choice
/// - [HeroOption.clear] if the user chose "No hero (manual)"
/// - a concrete [HeroOption] when a hero is picked
Future<HeroOption?> showHeroPicker(
  BuildContext context, {
  required LifeFormat format,
}) {
  return showModalBottomSheet<HeroOption>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (_) => _HeroPickerSheet(format: format),
  );
}

class _HeroPickerSheet extends ConsumerStatefulWidget {
  const _HeroPickerSheet({required this.format});

  final LifeFormat format;

  @override
  ConsumerState<_HeroPickerSheet> createState() => _HeroPickerSheetState();
}

class _HeroPickerSheetState extends ConsumerState<_HeroPickerSheet> {
  final _controller = TextEditingController();
  String _query = '';

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final asyncHeroes = ref.watch(heroOptionsProvider(widget.format));
    final theme = Theme.of(context);
    final height = MediaQuery.sizeOf(context).height * 0.85;
    final subtitle = switch (widget.format) {
      LifeFormat.cc => 'Classic Constructed — Heroes only',
      LifeFormat.silverAge => 'Silver Age — Young Heroes only',
    };

    return SizedBox(
      height: height,
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Choose hero',
                        style: theme.textTheme.titleLarge,
                      ),
                      Text(
                        subtitle,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: TextField(
              controller: _controller,
              autofocus: true,
              decoration: const InputDecoration(
                hintText: 'Search heroes…',
                prefixIcon: Icon(Icons.search),
                border: OutlineInputBorder(),
                isDense: true,
              ),
              onChanged: (v) => setState(() => _query = v),
            ),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: asyncHeroes.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(child: Text('Failed to load heroes: $e')),
              data: (heroes) {
                final tokens = queryTokens(_query);
                final filtered = tokens.isEmpty
                    ? heroes
                    : heroes.where((h) {
                        final text = h.name.toLowerCase();
                        return tokens.every(text.contains);
                      }).toList();

                return ListView.builder(
                  itemCount: filtered.length + 1,
                  itemBuilder: (context, index) {
                    if (index == 0) {
                      return ListTile(
                        leading: CircleAvatar(
                          backgroundColor:
                              theme.colorScheme.surfaceContainerHighest,
                          child: Icon(
                            Icons.person_off_outlined,
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                        ),
                        title: const Text('No hero (manual)'),
                        subtitle: const Text('Set starting life yourself'),
                        onTap: () =>
                            Navigator.of(context).pop(HeroOption.clear),
                      );
                    }
                    final hero = filtered[index - 1];
                    return ListTile(
                      leading: _HeroThumb(url: hero.imageUrl),
                      title: Text(hero.name),
                      subtitle: Text('${hero.life} life'),
                      onTap: () => Navigator.of(context).pop(hero),
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _HeroThumb extends StatelessWidget {
  const _HeroThumb({this.url});

  final String? url;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final placeholder = CircleAvatar(
      backgroundColor: theme.colorScheme.surfaceContainerHighest,
      child: Icon(Icons.person, color: theme.colorScheme.onSurfaceVariant),
    );
    if (url == null || url!.isEmpty) return placeholder;
    return ClipOval(
      child: CachedNetworkImage(
        imageUrl: url!,
        width: 40,
        height: 40,
        fit: BoxFit.cover,
        placeholder: (_, _) => placeholder,
        errorWidget: (_, _, _) => placeholder,
      ),
    );
  }
}
