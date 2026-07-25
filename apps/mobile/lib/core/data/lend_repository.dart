import '../models/lend_group.dart';
import '../sync/lend_sync.dart';
import 'cached_collection.dart';

class LendRepository extends CachedCollection<LendGroup> {
  LendRepository(super.prefs, super.journal);

  @override
  String get storageKey => 'lend_groups';

  @override
  LendSyncAdapter get adapter => const LendSyncAdapter();

  @override
  Map<String, dynamic> encode(LendGroup value) => value.toJson();

  @override
  LendGroup decode(Map<String, dynamic> json) => LendGroup.fromJson(json);
}
