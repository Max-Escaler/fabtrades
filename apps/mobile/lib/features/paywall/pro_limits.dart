import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/logic/free_limits.dart';
import '../../core/models/card_model.dart';
import '../../core/providers.dart';
import 'pro_paywall.dart';

/// Adds [card] to the binder or want list, turning a free-tier cap into an
/// upgrade offer instead of a tap that appears to do nothing.
///
/// This is the single place binder additions should go through, so every entry
/// point — Browse, card detail, the scanner, the want list — behaves the same
/// when a limit is reached.
///
/// The cap is surfaced as a snackbar with an Upgrade action rather than by
/// launching the paywall outright: someone who tapped "Add to Binder" didn't
/// ask to be sold to, and a modal in their face would read as a bait-and-switch.
/// If they do upgrade, the add they originally wanted is retried for them.
Future<bool> addToBinderOrUpsell(
  BuildContext context,
  WidgetRef ref,
  CardModel card, {
  bool isWanted = false,
  int quantity = 1,
  String? successMessage,
}) async {
  final binder = ref.read(binderProvider.notifier);

  if (binder.add(card, quantity: quantity, isWanted: isWanted)) {
    if (successMessage != null) _showMessage(context, successMessage);
    return true;
  }

  final limit = FreeLimits.cardsFor(isWanted: isWanted);
  final listName = isWanted ? 'Want lists' : 'Binders';
  return _offerUpgrade(
    context,
    ref,
    message: '$listName hold $limit cards on the free plan.',
    onUpgraded: () {
      binder.add(card, quantity: quantity, isWanted: isWanted);
      if (context.mounted) {
        _showMessage(
          context,
          successMessage ??
              'Added ${card.name} to ${isWanted ? 'Want List' : 'Binder'}',
        );
      }
    },
  );
}

/// Adds [card] to a lend group, or offers an upgrade when the free loaned-card
/// cap is hit. Borrowing groups are uncapped and never reach this path's limit.
Future<bool> addToLendOrUpsell(
  BuildContext context,
  WidgetRef ref, {
  required String groupId,
  required CardModel card,
  int quantity = 1,
}) async {
  final lend = ref.read(lendProvider.notifier);
  if (lend.addCard(groupId, card, quantity: quantity)) return true;

  return _offerUpgrade(
    context,
    ref,
    message:
        'The free plan tracks ${FreeLimits.loanedCards} loaned card. Upgrade to lend more.',
    onUpgraded: () {
      lend.addCard(groupId, card, quantity: quantity);
    },
  );
}

/// Bumps a lent card's quantity, or offers an upgrade when that would exceed
/// the free loaned-card cap.
Future<bool> setLendQuantityOrUpsell(
  BuildContext context,
  WidgetRef ref, {
  required String groupId,
  required String cardId,
  required int quantity,
}) async {
  final lend = ref.read(lendProvider.notifier);
  if (lend.setCardQuantity(groupId, cardId, quantity)) return true;

  return _offerUpgrade(
    context,
    ref,
    message:
        'The free plan tracks ${FreeLimits.loanedCards} loaned card. Upgrade to lend more.',
    onUpgraded: () {
      lend.setCardQuantity(groupId, cardId, quantity);
    },
  );
}

Future<bool> _offerUpgrade(
  BuildContext context,
  WidgetRef ref, {
  required String message,
  required VoidCallback onUpgraded,
}) async {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(
      SnackBar(
        content: Text(message),
        duration: const Duration(seconds: 6),
        action: SnackBarAction(
          label: 'Upgrade',
          onPressed: () async {
            if (!await presentProPaywall(context, ref)) return;
            onUpgraded();
          },
        ),
      ),
    );
  return false;
}

void _showMessage(BuildContext context, String message) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(
      SnackBar(content: Text(message), duration: const Duration(seconds: 2)),
    );
}
