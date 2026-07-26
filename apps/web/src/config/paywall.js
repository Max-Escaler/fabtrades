/**
 * Build-time switch for the no-paywalls distribution of FABTrades.
 *
 * When true, every Pro gate is open, free-tier caps do not apply, and
 * upgrade / subscribe copy is suppressed. Flip this only on the
 * `build/no-paywalls` branch — leave it false on main.
 */
export const PAYWALLS_REMOVED = true;
