import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/entitlement.dart';

/// Reads this account's `entitlements` row.
///
/// Read-only by design, and not by convention: the table has a select-own policy
/// and no write policy at all, so an attempt to grant yourself Pro from here
/// fails at the database. Only the RevenueCat webhook writes it.
class EntitlementRepository {
  EntitlementRepository(this._client);

  final SupabaseClient _client;

  /// The row for [userId], or null when there is none.
  ///
  /// Null is the common case rather than an edge one — a row only exists once
  /// somebody has transacted — and it means the same thing as `is_active: false`
  /// to every caller.
  Future<ServerEntitlement?> fetch(String userId) async {
    final row = await _client
        .from('entitlements')
        .select()
        .eq('user_id', userId)
        .maybeSingle();
    return row == null ? null : ServerEntitlement.fromJson(row);
  }
}
