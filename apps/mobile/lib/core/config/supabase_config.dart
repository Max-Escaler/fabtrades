/// Connection to the shared Supabase database (project `RiftTrades`,
/// `tenrvaghaspwdvnwvgrh`). FAB Trades reads its own `fab_*` tables / the
/// `fab_cards_with_prices` view in this shared project.
///
/// The publishable key is safe to ship in a client app — all card/price tables
/// are public read-only via RLS. Writes are reserved for the pipeline's service role.
class SupabaseConfig {
  static const String url = 'https://tenrvaghaspwdvnwvgrh.supabase.co';
  static const String publishableKey =
      'sb_publishable_ohMvMDesyA2rr4Y4nfALpg_i0N-swkr';
}
