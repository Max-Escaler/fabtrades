import 'package:flutter/material.dart';

import '../core/data/card_repository.dart';

/// Horizontal foil + sort chips shared by Browse (set view) and Binder.
class CardFilterBar extends StatelessWidget {
  const CardFilterBar({
    super.key,
    required this.filters,
    required this.onFoilOnly,
    required this.onSort,
    required this.onClear,
  });

  final CardFilters filters;
  final ValueChanged<bool> onFoilOnly;
  final ValueChanged<CardSort> onSort;
  final VoidCallback onClear;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 40,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        children: [
          FilterChip(
            label: const Text('Foil'),
            avatar: const Icon(Icons.auto_awesome, size: 16),
            selected: filters.foilOnly,
            onSelected: onFoilOnly,
          ),
          const SizedBox(width: 8),
          _DropChip<CardSort>(
            label: 'Sort',
            selected: filters.sort != CardSort.nameAsc,
            value: filters.sort,
            icon: Icons.sort,
            items: CardSort.values
                .map((s) => PopupMenuItem(value: s, child: Text(s.label)))
                .toList(),
            onSelected: onSort,
          ),
          if (filters.hasActiveFilters) ...[
            const SizedBox(width: 8),
            ActionChip(
              label: const Text('Clear'),
              avatar: const Icon(Icons.close, size: 16),
              onPressed: onClear,
            ),
          ],
        ],
      ),
    );
  }
}

class _DropChip<T> extends StatelessWidget {
  const _DropChip({
    required this.label,
    required this.selected,
    required this.value,
    required this.items,
    required this.onSelected,
    this.icon,
  });

  final String label;
  final bool selected;
  final T value;
  final List<PopupMenuEntry<T>> items;
  final ValueChanged<T> onSelected;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return PopupMenuButton<T>(
      initialValue: value,
      onSelected: onSelected,
      itemBuilder: (_) => items,
      child: Chip(
        backgroundColor: selected ? scheme.primaryContainer : null,
        label: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (icon != null) ...[
              Icon(icon, size: 16),
              const SizedBox(width: 4),
            ],
            Text(label),
            const Icon(Icons.arrow_drop_down, size: 18),
          ],
        ),
      ),
    );
  }
}
