/// Build-time switch for the no-paywalls distribution of FABTrades.
///
/// When [removed] is true, every Pro gate is open, free-tier caps do not apply,
/// and subscription UI (paywall, Customer Center, upgrade prompts) is hidden.
/// Flip this only on the `build/no-paywalls` branch — leave it false on main.
class PaywallConfig {
  const PaywallConfig._();

  /// True on the paywall-free build. Hard-coded so a missing dart-define cannot
  /// accidentally re-enable billing on this branch.
  static const removed = true;
}
