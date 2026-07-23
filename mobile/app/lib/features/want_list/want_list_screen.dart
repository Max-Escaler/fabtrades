import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/models/binder_entry.dart';
import '../../core/models/card_model.dart';
import '../../core/providers.dart';
import '../card_detail/card_detail_screen.dart';
import '../search/card_picker.dart';

/// Show-mode collage of Want List cards — embedded as the Want List tab inside
/// [BinderScreen], or usable standalone with its own scaffold.
class WantListPane extends ConsumerStatefulWidget {
  const WantListPane({super.key, this.onAdd, this.showFab = false});

  /// Called when the empty-state add button is pressed. Defaults to the
  /// card picker + binder want-list add if null.
  final VoidCallback? onAdd;

  /// When true, shows its own FAB (standalone use). Binder hosts its own FAB.
  final bool showFab;

  @override
  ConsumerState<WantListPane> createState() => _WantListPaneState();
}

class _WantListPaneState extends ConsumerState<WantListPane> {
  bool _editing = false;

  @override
  Widget build(BuildContext context) {
    final wanted =
        ref.watch(binderProvider).where((e) => e.isWanted).toList();

    final body = wanted.isEmpty
        ? _EmptyState(onAdd: widget.onAdd ?? () => _defaultAdd(context))
        : Column(
            children: [
              if (wanted.isNotEmpty)
                Align(
                  alignment: Alignment.centerRight,
                  child: IconButton(
                    icon: Icon(_editing ? Icons.done : Icons.edit_outlined),
                    tooltip: _editing ? 'Done' : 'Edit',
                    onPressed: () => setState(() => _editing = !_editing),
                  ),
                ),
              Expanded(
                child: _WantGrid(entries: wanted, editing: _editing),
              ),
            ],
          );

    if (!widget.showFab) return body;

    return Scaffold(
      appBar: AppBar(title: const Text('Want List')),
      body: body,
      floatingActionButton: FloatingActionButton.extended(
        heroTag: 'wantListFab',
        onPressed: widget.onAdd ?? () => _defaultAdd(context),
        icon: const Icon(Icons.add),
        label: const Text('Add card'),
      ),
    );
  }

  Future<void> _defaultAdd(BuildContext context) async {
    final card =
        await CardPickerScreen.show(context, title: 'Add to Want List');
    if (card == null) return;
    ref.read(binderProvider.notifier).add(card, isWanted: true);
  }
}

class _WantGrid extends ConsumerWidget {
  const _WantGrid({required this.entries, required this.editing});

  final List<BinderEntry> entries;
  final bool editing;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return GridView.builder(
      padding: const EdgeInsets.fromLTRB(12, 12, 12, 100),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
        // Standard trading-card aspect ratio (approx. 63mm x 88mm).
        childAspectRatio: 0.716,
      ),
      itemCount: entries.length,
      itemBuilder: (context, i) => _WantCard(
        entry: entries[i],
        editing: editing,
        onRemove: () => ref
            .read(binderProvider.notifier)
            .remove(entries[i].card.id, true),
      ),
    );
  }
}

class _WantCard extends StatelessWidget {
  const _WantCard({
    required this.entry,
    required this.editing,
    required this.onRemove,
  });

  final BinderEntry entry;
  final bool editing;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final card = entry.card;

    return Stack(
      children: [
        Positioned.fill(
          child: GestureDetector(
            onTap: editing
                ? null
                : () => Navigator.of(context).push(MaterialPageRoute(
                    builder: (_) => CardDetailScreen(card: card))),
            child: Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(14),
                border: card.isFoil
                    ? Border.all(color: const Color(0xFFB794F6), width: 2)
                    : Border.all(color: scheme.outlineVariant, width: 0.5),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.16),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(13),
                child: _CardImage(card: card),
              ),
            ),
          ),
        ),
        if (entry.quantity > 1)
          Positioned(
            left: 8,
            top: 8,
            child: _Badge(
              color: scheme.primary,
              child: Text('x${entry.quantity}',
                  style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w800,
                      fontSize: 13)),
            ),
          ),
        if (editing)
          Positioned(
            right: 6,
            top: 6,
            child: GestureDetector(
              onTap: onRemove,
              child: const _Badge(
                color: Color(0xFFD0554E),
                padding: EdgeInsets.all(5),
                child: Icon(Icons.close, color: Colors.white, size: 18),
              ),
            ),
          ),
      ],
    );
  }
}

class _CardImage extends StatelessWidget {
  const _CardImage({required this.card});
  final CardModel card;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final url = card.imageUrl;
    if (url == null || url.isEmpty) {
      return Container(
        color: scheme.surfaceContainerHighest,
        alignment: Alignment.center,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.image_not_supported_outlined,
                  size: 40, color: scheme.outline),
              const SizedBox(height: 8),
              Text(card.name,
                  textAlign: TextAlign.center,
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.w600)),
            ],
          ),
        ),
      );
    }
    return CachedNetworkImage(
      imageUrl: url,
      fit: BoxFit.cover,
      placeholder: (_, _) => Container(color: scheme.surfaceContainerHighest),
      errorWidget: (_, _, _) => Container(
        color: scheme.surfaceContainerHighest,
        child: Icon(Icons.broken_image_outlined, color: scheme.outline),
      ),
    );
  }
}

class _Badge extends StatelessWidget {
  const _Badge({
    required this.color,
    required this.child,
    this.padding = const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
  });
  final Color color;
  final Widget child;
  final EdgeInsets padding;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: color,
        shape: padding.horizontal == padding.vertical
            ? BoxShape.circle
            : BoxShape.rectangle,
        borderRadius:
            padding.horizontal == padding.vertical ? null : BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.25),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: child,
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.onAdd});
  final VoidCallback onAdd;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.favorite_border, size: 56, color: scheme.outline),
            const SizedBox(height: 16),
            Text('Your want list is empty',
                style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            Text(
              'Add the cards you\'re hunting for, then hand your phone to '
              'another player so they can scroll through and check their binder.',
              textAlign: TextAlign.center,
              style: TextStyle(color: scheme.onSurfaceVariant),
            ),
            const SizedBox(height: 20),
            FilledButton.icon(
              onPressed: onAdd,
              icon: const Icon(Icons.add),
              label: const Text('Add a card'),
            ),
          ],
        ),
      ),
    );
  }
}
