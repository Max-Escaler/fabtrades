import 'package:flutter/material.dart';

/// Prompts for an optional person name. Returns the entered string (possibly
/// empty for "no name"), or null if the dialog was cancelled/dismissed.
Future<String?> askPersonName(
  BuildContext context, {
  required bool isBorrowing,
  String? initial,
}) {
  final controller = TextEditingController(text: initial ?? '');
  return showAdaptiveDialog<String>(
    context: context,
    builder: (context) => AlertDialog.adaptive(
      title: Text(isBorrowing ? 'Borrowing from' : 'Lent to'),
      content: TextField(
        controller: controller,
        autofocus: true,
        textCapitalization: TextCapitalization.words,
        decoration: const InputDecoration(
          labelText: 'Name (optional)',
          hintText: 'e.g. Alex',
        ),
        onSubmitted: (v) => Navigator.of(context).pop(v.trim()),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: () => Navigator.of(context).pop(controller.text.trim()),
          child: const Text('Save'),
        ),
      ],
    ),
  );
}
