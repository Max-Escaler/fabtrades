/**
 * The nightly sweep's logic, with Postgres and RevenueCat held at arm's length.
 *
 * Separated from `index.ts` so the parts that decide who gets checked, what counts
 * as a change, and what happens when one customer fails can be tested without
 * either service.
 */

import { FREE, readEntitlement } from '../_shared/entitlement.ts';
import type { EntitlementState, RevenueCatSubscriber } from '../_shared/entitlement.ts';

/**
 * How far past an expiry to keep re-checking.
 *
 * A renewal can be recorded hours late and a failing card retried for days. Give up
 * after a week: by then the row says "expired", which is also the answer.
 */
export const GRACE_WINDOW_DAYS = 7;

/** How far ahead to look, so a renewal is picked up rather than read as a lapse. */
export const LOOKAHEAD_HOURS = 36;

/**
 * Every column `readEntitlement` derives, plus the key, as a Postgres select list.
 *
 * Read off `FREE` rather than written out by hand, because a column left out of the
 * select reads as unchanged — it would silently stop being reconciled.
 */
export const TRACKED_COLUMNS = ['user_id', ...Object.keys(FREE)].join(', ');

/**
 * A stored entitlement row, as far as reconciliation cares.
 *
 * Columns are optional and indexed by name because the comparison walks them
 * generically: a row selected without one of them must read as *changed*, not as
 * absent, or that column would quietly stop being reconciled.
 */
export interface EntitlementRow extends Partial<EntitlementState> {
  user_id: string;
  [column: string]: unknown;
}

export interface ReconcileDeps {
  entitlementId: string;
  /** Rows whose expiry falls in [from, to] and that currently grant access. */
  listDue(from: string, to: string): Promise<EntitlementRow[]>;
  saveEntitlement(userId: string, state: EntitlementState): Promise<void>;
  fetchSubscriber(appUserId: string): Promise<RevenueCatSubscriber | null>;
  now?: Date;
}

export interface ReconcileResult {
  checked: number;
  changed: number;
  failed: string[];
}

export async function reconcile(deps: ReconcileDeps): Promise<ReconcileResult> {
  const now = deps.now ?? new Date();
  const from = new Date(now.getTime() - GRACE_WINDOW_DAYS * 86_400_000);
  const to = new Date(now.getTime() + LOOKAHEAD_HOURS * 3_600_000);

  const due = await deps.listDue(from.toISOString(), to.toISOString());

  let changed = 0;
  const failed: string[] = [];

  // Sequential on purpose: this runs unattended against a third-party API, and the
  // set is small by construction, so parallel requests risk rate limiting for no gain.
  for (const row of due) {
    try {
      const subscriber = await deps.fetchSubscriber(row.user_id);
      const state = readEntitlement(subscriber, deps.entitlementId, now);

      // Only write when something actually moved, so `updated_at` keeps meaning
      // "when this last changed" rather than "when a job last ran".
      if (!differs(row, state)) continue;

      await deps.saveEntitlement(row.user_id, state);
      changed++;
      console.log(
        `Reconciled ${row.user_id}: ${row.tier} -> ${state.tier}, ` +
          `expires ${row.expires_at} -> ${state.expires_at}`,
      );
    } catch (error) {
      // One unreachable customer must not abandon the rest of the sweep, and
      // tomorrow's run picks them up again regardless.
      failed.push(row.user_id);
      console.error(`Failed to reconcile ${row.user_id}`, error);
    }
  }

  return { checked: due.length, changed, failed };
}

/**
 * Whether the stored row disagrees with what RevenueCat now reports.
 *
 * Compares every field `readEntitlement` derives, not just the tier. A renewal moves
 * only `expires_at`, and skipping that write would leave the row permanently stale:
 * still inside tonight's window, still skipped, every night after.
 */
export function differs(
  row: EntitlementRow,
  state: EntitlementState,
): boolean {
  return Object.entries(state).some(([column, derived]) =>
    column.endsWith('_at')
      ? !sameInstant(row[column], derived)
      : row[column] !== derived
  );
}

/**
 * Timestamp equality that ignores how each side spells it.
 *
 * Postgres returns `2026-07-15T12:00:00+00:00` where RevenueCat sent
 * `2026-07-15T12:00:00Z`. As strings those differ, and every row would look changed
 * on every run — turning a targeted repair into a nightly rewrite of `updated_at`.
 */
function sameInstant(a: unknown, b: unknown): boolean {
  if (a == null || b == null) return a == null && b == null;
  const left = new Date(String(a)).getTime();
  const right = new Date(String(b)).getTime();
  if (Number.isNaN(left) || Number.isNaN(right)) return String(a) === String(b);
  return left === right;
}
