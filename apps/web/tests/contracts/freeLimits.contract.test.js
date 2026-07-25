// Contract tests for the free-tier caps.
//
// These assert the shared fixtures in packages/contracts, which the Dart
// implementation in apps/mobile is held to as well. The caps have to match
// exactly: mobile enforces the trade window by tombstoning rows, so a web app
// that kept more would watch mobile delete trades it had saved.
//
// Web has no binder, so only `savedTrades` has behaviour to assert here; the
// other two numbers are still checked, which is what stops them drifting before
// web grows a binder to enforce them with.
import contract from '../../../../packages/contracts/free_limits.json';
import { FreeLimits, tradesOverFreeLimit } from '../../src/utils/freeLimits.js';

describe('free limits contract', () => {
    it('agrees with the shared caps', () => {
        expect(FreeLimits).toEqual(contract.limits);
    });

    contract.cases
        .filter((testCase) => testCase.limit === 'savedTrades')
        .forEach((testCase) => {
            it(testCase.name, () => {
                // Saving is never refused, only trimmed. Anything else would lose the
                // trade the customer just built.
                expect(testCase.allowed).toBe(true);
                expect(tradesOverFreeLimit(testCase.existing + 1)).toBe(testCase.trimmed);
            });
        });

    it('trims nothing for an account inside the window', () => {
        expect(tradesOverFreeLimit(0)).toBe(0);
        expect(tradesOverFreeLimit(FreeLimits.savedTrades)).toBe(0);
    });
});
