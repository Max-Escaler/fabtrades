/// Compare two dotted version strings (e.g. `1.0.2` vs `1.0.10`).
///
/// Returns negative if [a] < [b], zero if equal, positive if [a] > [b].
/// Non-numeric suffixes on a segment are ignored (so `1.0.1+4` and `1.0.1`
/// compare equal on the name portion when callers strip the build already).
int compareVersions(String a, String b) {
  final partsA = _segments(a);
  final partsB = _segments(b);
  final len = partsA.length > partsB.length ? partsA.length : partsB.length;
  for (var i = 0; i < len; i++) {
    final ai = i < partsA.length ? partsA[i] : 0;
    final bi = i < partsB.length ? partsB[i] : 0;
    if (ai != bi) return ai.compareTo(bi);
  }
  return 0;
}

/// True when [installed] is strictly behind [latest].
bool isVersionBehind(String installed, String latest) =>
    compareVersions(installed, latest) < 0;

List<int> _segments(String version) {
  final cleaned = version.trim().split('+').first.split('-').first;
  if (cleaned.isEmpty) return const [0];
  return cleaned.split('.').map((part) {
    final match = RegExp(r'^\d+').firstMatch(part);
    return match == null ? 0 : int.parse(match.group(0)!);
  }).toList();
}
