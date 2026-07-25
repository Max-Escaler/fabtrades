import '../models/trade.dart';
import '../sync/trade_sync.dart';
import 'cached_collection.dart';

class TradeRepository extends CachedCollection<Trade> {
  TradeRepository(super.prefs, super.journal);

  @override
  String get storageKey => 'saved_trades';

  @override
  TradeSyncAdapter get adapter => const TradeSyncAdapter();

  @override
  Map<String, dynamic> encode(Trade value) => value.toJson();

  @override
  Trade decode(Map<String, dynamic> json) => Trade.fromJson(json);
}
