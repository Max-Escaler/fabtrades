import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/widgets.dart';
import '../../core/data/card_repository.dart';
import '../../core/models/card_model.dart';
import '../../core/providers.dart';

/// A search screen that returns the picked [CardModel] via Navigator.pop.
class CardPickerScreen extends ConsumerStatefulWidget {
  const CardPickerScreen({super.key, this.title = 'Add a card'});
  final String title;

  static Future<CardModel?> show(BuildContext context, {String? title}) {
    return Navigator.of(context).push<CardModel>(
      MaterialPageRoute(
        builder: (_) => CardPickerScreen(title: title ?? 'Add a card'),
      ),
    );
  }

  @override
  ConsumerState<CardPickerScreen> createState() => _CardPickerScreenState();
}

class _CardPickerScreenState extends ConsumerState<CardPickerScreen> {
  final _controller = TextEditingController();
  Timer? _debounce;
  String _query = '';
  bool _foilOnly = false;

  @override
  void dispose() {
    _debounce?.cancel();
    _controller.dispose();
    super.dispose();
  }

  void _onChanged(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 200), () {
      setState(() => _query = value);
    });
  }

  @override
  Widget build(BuildContext context) {
    final pricing = ref.watch(pricingProvider);
    final catalog = ref.watch(catalogProvider);
    return Scaffold(
      appBar: AppBar(title: Text(widget.title)),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 4),
            child: TextField(
              controller: _controller,
              autofocus: true,
              onChanged: _onChanged,
              decoration: const InputDecoration(
                hintText: 'Search cards…',
                prefixIcon: Icon(Icons.search),
              ),
            ),
          ),
          Align(
            alignment: Alignment.centerLeft,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: FilterChip(
                label: const Text('Foil only'),
                avatar: const Icon(Icons.auto_awesome, size: 16),
                selected: _foilOnly,
                onSelected: (v) => setState(() => _foilOnly = v),
              ),
            ),
          ),
          Expanded(
            child: catalog.when(
              loading: () =>
                  const Center(child: CircularProgressIndicator.adaptive()),
              error: (e, _) =>
                  Center(child: Text('Could not load cards.\n$e')),
              data: (all) {
                final cards = filterCards(
                  all,
                  CardFilters(
                    query: _query,
                    foilOnly: _foilOnly,
                    sort: CardSort.nameAsc,
                  ),
                );
                if (cards.isEmpty) {
                  return const Center(child: Text('No cards found.'));
                }
                return ListView.separated(
                  itemCount: cards.length,
                  separatorBuilder: (_, _) =>
                      const Divider(height: 1, indent: 72),
                  itemBuilder: (context, i) {
                    final card = cards[i];
                    return CardRow(
                      card: card,
                      priceLabel: pricing.priceLabel(card),
                      secondaryLabel: pricing.lowPriceLabel(card),
                      trailing: const Icon(Icons.add_circle),
                      onTap: () => Navigator.of(context).pop(card),
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
