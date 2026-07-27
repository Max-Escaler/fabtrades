import 'package:flutter_test/flutter_test.dart';
import 'package:fabtrades/core/data/card_repository.dart';

import '../../support/fixtures.dart';

void main() {
  group('isTokenCard', () {
    test('detects Token in semicolon-delimited card_type', () {
      expect(isTokenCard(buildCard(cardType: 'Token')), isTrue);
      expect(isTokenCard(buildCard(cardType: 'Hero;Token')), isTrue);
      expect(isTokenCard(buildCard(cardType: 'Token;Weapon')), isTrue);
      expect(isTokenCard(buildCard(cardType: 'Equipment;Token')), isTrue);
    });

    test('card_type Token still wins when rarity is Common or Promo', () {
      // Real data: Frostbite EVR197 is card_type='Token', rarity='Common'.
      // Proves the fix did not invert the dependency to rarity-only.
      expect(
        isTokenCard(buildCard(cardType: 'Token', rarity: 'Common')),
        isTrue,
      );
      expect(
        isTokenCard(buildCard(cardType: 'Token', rarity: 'Promo')),
        isTrue,
      );
    });

    test('null/blank card_type with rarity Token is a token', () {
      expect(
        isTokenCard(buildCard(cardType: null, rarity: 'Token')),
        isTrue,
      );
      expect(
        isTokenCard(buildCard(cardType: '  ', rarity: 'Token')),
        isTrue,
      );
    });

    test('returns false for ordinary card types', () {
      expect(isTokenCard(buildCard(cardType: 'Action')), isFalse);
      expect(isTokenCard(buildCard(cardType: 'Defense Reaction')), isFalse);
      expect(isTokenCard(buildCard(cardType: 'Instant')), isFalse);
    });

    test(
      'rarity Token alone does not make a typed non-token a token',
      () {
        // TCGplayer stamps rarity='Token' on ordinary cards printed on
        // token/deck-insert sheets. Those must not poison tokenNameKeys.
        expect(
          isTokenCard(
            buildCard(
              name: 'Harmonized Kodachi',
              cardType: 'Weapon',
              rarity: 'Token',
            ),
          ),
          isFalse,
        );
        expect(
          isTokenCard(
            buildCard(
              name: 'Phoenix Flame',
              cardType: 'Action',
              rarity: 'Token',
            ),
          ),
          isFalse,
        );
        expect(
          isTokenCard(
            buildCard(name: 'Dorinthea', cardType: 'Hero', rarity: 'Token'),
          ),
          isFalse,
        );
        // Real combination: Quicken // Romping Club is Hero;Weapon + Token
        // rarity — Weapon/Hero are not Token parts.
        expect(
          isTokenCard(
            buildCard(
              name: 'Quicken // Romping Club',
              cardType: 'Hero;Weapon',
              rarity: 'Token',
            ),
          ),
          isFalse,
        );
      },
    );
  });

  group('tokenNameKeys', () {
    test('key matches baseCardName normalization (lowercase, no punctuation)', () {
      final token = buildCard(name: 'Runechant', cardType: 'Token');
      final keys = tokenNameKeys([token]);
      // Same pipeline identifyCards uses for membership: baseCardName then
      // lowercase + strip non-alphanumerics. Token names have no pitch.
      final expected = baseCardName('Runechant')
          .toLowerCase()
          .replaceAll(RegExp(r'[^a-z0-9]+'), ' ')
          .trim()
          .replaceAll(RegExp(r'\s+'), ' ');
      expect(expected, 'runechant');
      expect(keys, contains(expected));
    });

    test('includes a name when any printing of that name is a token', () {
      final typed = buildCard(id: 'typed', name: 'Runechant', cardType: 'Token');
      final untyped = buildCard(
        id: 'untyped',
        name: 'Runechant',
        cardType: null,
        rarity: 'Common',
      );
      final keys = tokenNameKeys([typed, untyped]);
      expect(keys, contains('runechant'));
    });

    test(
      'excludes sheet-print names that only carry rarity Token',
      () {
        final kodachi = buildCard(
          name: 'Harmonized Kodachi',
          cardType: 'Weapon',
          rarity: 'Token',
        );
        final phoenix = buildCard(
          name: 'Phoenix Flame',
          cardType: 'Action',
          rarity: 'Token',
        );
        final keys = tokenNameKeys([kodachi, phoenix]);
        expect(keys, isNot(contains('harmonized kodachi')));
        expect(keys, isNot(contains('phoenix flame')));
      },
    );

    test(
      'spectral shield Action+Token printings: name is token via cross-printing '
      '(accepted trade-off for a genuinely ambiguous name)',
      () {
        // Spectral Shield is both a real Action and a Token in the catalog.
        // Treating the shared name as token-ish is the safe choice.
        final action = buildCard(
          id: 'ss-action',
          name: 'Spectral Shield',
          cardType: 'Action',
          rarity: 'Common',
        );
        final token = buildCard(
          id: 'ss-token',
          name: 'Spectral Shield',
          cardType: 'Token',
          rarity: 'Token',
        );
        final keys = tokenNameKeys([action, token]);
        expect(keys, contains('spectral shield'));
      },
    );
  });

  group('identifyCards token mentions', () {
    final readTheRunes = buildCard(
      id: 'read-the-runes',
      name: 'Read the Runes (Blue)',
      cardType: 'Action',
      collectorNumber: '189/193',
    );
    final runechant = buildCard(
      id: 'runechant',
      name: 'Runechant',
      cardType: 'Token',
      rarity: 'Token',
      collectorNumber: '001/001',
    );

    const guideWithCreateCue =
        'Read the Runes\nBlue\nInstant\nCreate a Runechant token for each '
        'card with pitch value you own that is banished this way.';

    test('does not identify a token merely mentioned in rules text', () {
      final result = identifyCards(
        [readTheRunes, runechant],
        guideWithCreateCue,
        titleText: 'Read the Runes',
      );
      expect(result, isNotEmpty);
      expect(result.first.id, 'read-the-runes');
      expect(result.map((c) => c.id), isNot(contains('runechant')));
    });

    test('partial title read returns empty rather than locking onto the token', () {
      // Real failure mode: title band only got "Read the", and guide OCR also
      // missed "Runes", so bag-of-words would otherwise treat Runechant (from
      // rules text) as the only full name match.
      const guideMissingRunes =
          'Read the\nBlue\nInstant\nCreate a Runechant token for each '
          'card with pitch value you own that is banished this way.';
      final result = identifyCards(
        [readTheRunes, runechant],
        guideMissingRunes,
        titleText: 'Read the',
      );
      expect(result, isEmpty);
    });

    test('genuine token scan still works when the title band names it', () {
      final result = identifyCards(
        [readTheRunes, runechant],
        'Runechant\nToken - Aura\nWhen you attack or defend with this…',
        titleText: 'Runechant',
      );
      expect(result.map((c) => c.id), contains('runechant'));
    });

    test('null card_type token row is suppressed via sibling tokenNameKeys', () {
      final nullTyped = buildCard(
        id: 'runechant-null',
        name: 'Runechant',
        cardType: null,
        rarity: 'Common',
        collectorNumber: '002/001',
      );
      // Sibling printing supplies Token type for the shared name key.
      final catalog = [readTheRunes, nullTyped, runechant];
      final result = identifyCards(
        catalog,
        guideWithCreateCue,
        titleText: 'Read the Runes',
      );
      expect(result.map((c) => c.id), isNot(contains('runechant-null')));
      expect(result.map((c) => c.id), isNot(contains('runechant')));
      expect(result.first.id, 'read-the-runes');
    });

    test('non-token look-alikes still match when their full names are read', () {
      final reduce = buildCard(
        id: 'reduce',
        name: 'Reduce to Runechant',
        cardType: 'Defense Reaction',
        collectorNumber: '010/100',
      );
      final envy = buildCard(
        id: 'envy',
        name: 'Runechant of Envy (Yellow)',
        cardType: 'Instant',
        collectorNumber: '011/100',
      );
      final catalog = [runechant, reduce, envy];

      // Longer non-token names still win the existing token-count ranking; the
      // token gate must not suppress them just because their name contains a
      // token word.
      final reduceHits = identifyCards(
        catalog,
        'Reduce to Runechant\nDefense Reaction',
        titleText: 'Reduce to Runechant',
      );
      expect(reduceHits.first.id, 'reduce');

      final envyHits = identifyCards(
        catalog,
        'Runechant of Envy\nYellow\nInstant',
        titleText: 'Runechant of Envy',
      );
      expect(envyHits.first.id, 'envy');
    });

    test('creation-cue fallback when titleText is null', () {
      final catalog = [runechant, readTheRunes];

      final fromRules = identifyCards(catalog, 'Create a Runechant token');
      expect(fromRules.map((c) => c.id), isNot(contains('runechant')));

      // Type line under a real token name — "Token" after the name must NOT
      // be treated as a creation cue.
      final genuine = identifyCards(catalog, 'Runechant Token - Aura');
      expect(genuine.map((c) => c.id), contains('runechant'));
    });

    test(
      'sheet-print Weapon/Action with rarity Token still matches from body '
      'when title band omits the name',
      () {
        // Regression: rarity='Token' on Harmonized Kodachi / Phoenix Flame
        // must not force the title-band gate — they behave like any other
        // non-token card.
        final kodachi = buildCard(
          id: 'kodachi',
          name: 'Harmonized Kodachi',
          cardType: 'Weapon',
          rarity: 'Token',
          collectorNumber: '010/100',
        );
        final phoenix = buildCard(
          id: 'phoenix',
          name: 'Phoenix Flame',
          cardType: 'Action',
          rarity: 'Token',
          collectorNumber: '011/100',
        );
        final keys = tokenNameKeys([kodachi, phoenix]);
        expect(keys, isNot(contains('harmonized kodachi')));
        expect(keys, isNot(contains('phoenix flame')));

        final kodachiHits = identifyCards(
          [kodachi, phoenix],
          'Harmonized Kodachi\nWeapon - Dagger (2H)',
          titleText: 'Something else entirely',
        );
        expect(kodachiHits.map((c) => c.id), contains('kodachi'));

        final phoenixHits = identifyCards(
          [kodachi, phoenix],
          'Phoenix Flame\nAction - Attack',
          titleText: 'Unrelated title band',
        );
        expect(phoenixHits.map((c) => c.id), contains('phoenix'));
      },
    );

    test(
      'null card_type Marked with rarity Token is gated like a real token',
      () {
        // Null-type recovery: Marked is token-only in the data and a
        // single-word name that appears in other cards' rules text.
        final marked = buildCard(
          id: 'marked',
          name: 'Marked',
          cardType: null,
          rarity: 'Token',
          collectorNumber: '001/001',
        );
        expect(isTokenCard(marked), isTrue);
        expect(tokenNameKeys([marked]), contains('marked'));

        final result = identifyCards(
          [marked],
          'Create a Marked token',
          titleText: 'Some Other Card',
        );
        expect(result.map((c) => c.id), isNot(contains('marked')));
      },
    );
  });
}
