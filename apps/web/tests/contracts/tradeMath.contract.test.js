// Contract tests for trade totals.
//
// These assert the shared fixtures in packages/contracts, which the Dart
// implementation in apps/mobile is held to as well. Cash is out of scope: mobile
// takes it as an input, web derives it from the difference. See
// packages/contracts/README.md.
import contract from '../../../../packages/contracts/trade_math.json';
import { calculateTotal, calculateDiff } from '../../src/utils/trade.js';

describe('trade math contract', () => {
    contract.cases.forEach((testCase) => {
        it(testCase.name, () => {
            const haveTotal = calculateTotal(testCase.have);
            const wantTotal = calculateTotal(testCase.want);

            expect(haveTotal).toBeCloseTo(testCase.haveTotal, 9);
            expect(wantTotal).toBeCloseTo(testCase.wantTotal, 9);
            expect(calculateDiff(haveTotal, wantTotal)).toBeCloseTo(testCase.diff, 9);
        });
    });
});
