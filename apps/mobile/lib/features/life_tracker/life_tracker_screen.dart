import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:wakelock_plus/wakelock_plus.dart';

import '../../app/theme.dart';
import 'audit_history_sheet.dart';
import 'life_tracker_models.dart';
import 'life_tracker_provider.dart';
import 'tracker_settings_sheet.dart';

class LifeTrackerScreen extends ConsumerStatefulWidget {
  const LifeTrackerScreen({super.key});

  @override
  ConsumerState<LifeTrackerScreen> createState() => _LifeTrackerScreenState();
}

class _LifeTrackerScreenState extends ConsumerState<LifeTrackerScreen> {
  @override
  void initState() {
    super.initState();
    WakelockPlus.enable();
  }

  @override
  void dispose() {
    WakelockPlus.disable();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(lifeTrackerProvider);
    final notifier = ref.read(lifeTrackerProvider.notifier);
    final scheme = Theme.of(context).colorScheme;

    return Scaffold(
      backgroundColor: scheme.surface,
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: RotatedBox(
                quarterTurns: 2,
                child: _PlayerLifePanel(
                  player: state.opponent,
                  onAdjust: (delta) =>
                      notifier.adjustLife(opponent: true, delta: delta),
                ),
              ),
            ),
            _CenterBar(
              remainingSeconds: state.timerRemainingSeconds,
              running: state.timerRunning,
              onToggleTimer: notifier.toggleTimer,
              onHistory: () => showAuditHistorySheet(context),
              onSettings: () => showTrackerSettingsSheet(context),
              onClose: () => Navigator.of(context).pop(),
            ),
            Expanded(
              child: _PlayerLifePanel(
                player: state.you,
                onAdjust: (delta) =>
                    notifier.adjustLife(opponent: false, delta: delta),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CenterBar extends StatelessWidget {
  const _CenterBar({
    required this.remainingSeconds,
    required this.running,
    required this.onToggleTimer,
    required this.onHistory,
    required this.onSettings,
    required this.onClose,
  });

  final int remainingSeconds;
  final bool running;
  final VoidCallback onToggleTimer;
  final VoidCallback onHistory;
  final VoidCallback onSettings;
  final VoidCallback onClose;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final expired = remainingSeconds <= 0;
    final mm = (remainingSeconds ~/ 60).toString().padLeft(2, '0');
    final ss = (remainingSeconds % 60).toString().padLeft(2, '0');

    final timerColor = expired
        ? scheme.error
        : running
            ? scheme.onSurface
            : scheme.onSurfaceVariant;

    return Material(
      color: scheme.surfaceContainerHighest,
      child: SizedBox(
        height: 56,
        child: Row(
          children: [
            IconButton(
              tooltip: 'History',
              icon: const Icon(Icons.history),
              onPressed: onHistory,
            ),
            Expanded(
              child: Center(
                child: InkWell(
                  onTap: onToggleTimer,
                  borderRadius: BorderRadius.circular(20),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 8,
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          running
                              ? Icons.pause_rounded
                              : Icons.play_arrow_rounded,
                          size: 20,
                          color: timerColor,
                        ),
                        const SizedBox(width: 6),
                        Text(
                          '$mm:$ss',
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontFeatures: const [FontFeature.tabularFigures()],
                            fontWeight: FontWeight.w700,
                            color: timerColor,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
            IconButton(
              tooltip: 'Settings',
              icon: const Icon(Icons.settings_outlined),
              onPressed: onSettings,
            ),
            IconButton(
              tooltip: 'Close',
              icon: const Icon(Icons.close),
              onPressed: onClose,
            ),
          ],
        ),
      ),
    );
  }
}

class _PlayerLifePanel extends StatefulWidget {
  const _PlayerLifePanel({
    required this.player,
    required this.onAdjust,
  });

  final PlayerState player;
  final ValueChanged<int> onAdjust;

  @override
  State<_PlayerLifePanel> createState() => _PlayerLifePanelState();
}

class _PlayerLifePanelState extends State<_PlayerLifePanel> {
  static const _holdInterval = Duration(milliseconds: 450);
  Timer? _holdTimer;

  void _startHold(int delta) {
    HapticFeedback.selectionClick();
    widget.onAdjust(delta);
    _holdTimer?.cancel();
    _holdTimer = Timer.periodic(_holdInterval, (_) {
      HapticFeedback.selectionClick();
      widget.onAdjust(delta);
    });
  }

  void _endHold() {
    _holdTimer?.cancel();
    _holdTimer = null;
  }

  @override
  void dispose() {
    _holdTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final player = widget.player;
    final pending = player.pendingDelta;
    final hero = player.config.heroName;

    final deltaColor =
        pending >= 0 ? AppTheme.positive : AppTheme.negative;
    final deltaText = pending > 0 ? '+$pending' : '$pending';

    return ColoredBox(
      color: scheme.surface,
      child: Stack(
        fit: StackFit.expand,
        children: [
          Row(
            children: [
              Expanded(
                child: GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: () {
                    HapticFeedback.selectionClick();
                    widget.onAdjust(-1);
                  },
                  onLongPressStart: (_) => _startHold(-5),
                  onLongPressEnd: (_) => _endHold(),
                  onLongPressCancel: _endHold,
                  child: const Align(
                    alignment: Alignment.centerLeft,
                    child: Padding(
                      padding: EdgeInsets.only(left: 20),
                      child: Opacity(
                        opacity: 0.35,
                        child: Text(
                          '−',
                          style: TextStyle(fontSize: 36, fontWeight: FontWeight.w300),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              Expanded(
                child: GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: () {
                    HapticFeedback.selectionClick();
                    widget.onAdjust(1);
                  },
                  onLongPressStart: (_) => _startHold(5),
                  onLongPressEnd: (_) => _endHold(),
                  onLongPressCancel: _endHold,
                  child: const Align(
                    alignment: Alignment.centerRight,
                    child: Padding(
                      padding: EdgeInsets.only(right: 20),
                      child: Opacity(
                        opacity: 0.35,
                        child: Text(
                          '+',
                          style: TextStyle(fontSize: 36, fontWeight: FontWeight.w300),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
          IgnorePointer(
            child: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  AnimatedOpacity(
                    opacity: pending != 0 ? 1 : 0,
                    duration: const Duration(milliseconds: 200),
                    child: AnimatedSlide(
                      offset: pending != 0
                          ? Offset.zero
                          : const Offset(0, 0.25),
                      duration: const Duration(milliseconds: 200),
                      child: Text(
                        pending == 0 ? ' ' : deltaText,
                        style: theme.textTheme.headlineMedium?.copyWith(
                          color: deltaColor,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ),
                  Text(
                    '${player.life}',
                    style: theme.textTheme.displayLarge?.copyWith(
                      fontSize: 108,
                      fontWeight: FontWeight.w800,
                      height: 1.0,
                      fontFeatures: const [FontFeature.tabularFigures()],
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    hero ?? ' ',
                    style: theme.textTheme.titleMedium?.copyWith(
                      color: scheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
