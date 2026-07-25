/// One user-owned record as the merge sees it: an opaque value plus the only two
/// facts reconciliation depends on — when it last changed, and whether it is a
/// tombstone.
class SyncRecord<T> {
  const SyncRecord({
    required this.id,
    required this.value,
    required this.updatedAt,
  });

  /// Tombstone: this record existed and was deleted at [updatedAt].
  ///
  /// A tombstone is not the same as an absent record. Absence means "never seen
  /// here", which the other side would answer by sending the record again. Only an
  /// explicit deletion timestamp lets a delete win a merge.
  const SyncRecord.deleted({required this.id, required this.updatedAt})
      : value = null;

  /// Stable across devices. For most domains this is a client-minted id; for the
  /// binder it is derived from the printing and which list it sits on, so two
  /// devices adding the same card converge instead of duplicating it.
  final String id;

  final T? value;

  final DateTime updatedAt;

  bool get isDeleted => value == null;
}

/// The winner of a merge, and which side it came from.
///
/// Callers need the provenance, not just the value: a record the local side won
/// still has to be pushed, and one the remote side won still has to be written to
/// the local cache. Collapsing both into "here is the merged list" would force a
/// full push and a full local rewrite on every sync.
enum SyncSide { local, remote }

class MergedRecord<T> {
  const MergedRecord(this.record, this.winner);

  final SyncRecord<T> record;
  final SyncSide winner;
}

/// Reconciles two views of the same collection, last-write-wins per record.
///
/// Ties are broken toward deletion. Equal timestamps with different payloads are
/// only reachable via clock coincidence, but resurrecting something a customer
/// deleted is worse than losing a concurrent edit, and a deterministic rule means
/// both devices reach the same answer instead of pushing at each other forever.
///
/// Otherwise a tie keeps the local copy, so the device in your hand never appears
/// to discard an edit you just made.
List<MergedRecord<T>> mergeRecords<T>(
  Iterable<SyncRecord<T>> local,
  Iterable<SyncRecord<T>> remote,
) {
  final byId = <String, MergedRecord<T>>{};

  for (final record in local) {
    byId[record.id] = MergedRecord(record, SyncSide.local);
  }

  for (final incoming in remote) {
    final existing = byId[incoming.id];
    if (existing == null) {
      byId[incoming.id] = MergedRecord(incoming, SyncSide.remote);
      continue;
    }
    if (_remoteWins(existing.record, incoming)) {
      byId[incoming.id] = MergedRecord(incoming, SyncSide.remote);
    }
  }

  return byId.values.toList(growable: false);
}

bool _remoteWins<T>(SyncRecord<T> local, SyncRecord<T> remote) {
  if (remote.updatedAt.isAfter(local.updatedAt)) return true;
  if (remote.updatedAt.isBefore(local.updatedAt)) return false;
  return remote.isDeleted && !local.isDeleted;
}
