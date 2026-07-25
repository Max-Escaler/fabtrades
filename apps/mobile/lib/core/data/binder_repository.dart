import '../models/binder_entry.dart';
import '../sync/binder_sync.dart';
import 'cached_collection.dart';

class BinderRepository extends CachedCollection<BinderEntry> {
  BinderRepository(super.prefs, super.journal);

  /// Legacy key kept so existing device data carries over untouched.
  @override
  String get storageKey => 'collection_entries';

  @override
  BinderSyncAdapter get adapter => const BinderSyncAdapter();

  @override
  Map<String, dynamic> encode(BinderEntry value) => value.toJson();

  @override
  BinderEntry decode(Map<String, dynamic> json) => BinderEntry.fromJson(json);
}
