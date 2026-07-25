// Contract tests for browse-list ordering.
//
// These assert the shared fixtures in packages/contracts, which the Dart
// implementation in apps/mobile is held to as well. A failure here means either
// this file's logic drifted from mobile, or the agreed behaviour changed and both
// sides plus the fixture need updating. See packages/contracts/README.md.
import contract from '../../../../packages/contracts/set_sort.json';
import {
    BROWSE_TIER,
    setBrowseTier,
    browseTierLabel,
    compareSetNamesByBrowseOrder,
    compareSetsByBrowseOrder,
} from '../../src/utils/setSort.js';

describe('set sort contract', () => {
    it('agrees with the fixture on tier constants', () => {
        expect(BROWSE_TIER).toEqual(contract.tiers);
    });

    describe('setBrowseTier', () => {
        contract.browseTier.forEach(({ name, tier }) => {
            it(`buckets ${JSON.stringify(name)} as tier ${tier}`, () => {
                expect(setBrowseTier(name)).toBe(tier);
            });
        });
    });

    describe('browseTierLabel', () => {
        contract.tierLabel.forEach(({ tier, label }) => {
            it(`labels tier ${tier} as "${label}"`, () => {
                expect(browseTierLabel(tier)).toBe(label);
            });
        });
    });

    describe('compareSetNamesByBrowseOrder', () => {
        contract.compareNames.forEach(({ a, b, sign }) => {
            it(`orders ${JSON.stringify(a)} vs ${JSON.stringify(b)} as ${sign}`, () => {
                expect(Math.sign(compareSetNamesByBrowseOrder(a, b))).toBe(sign);
            });
        });
    });

    describe('compareSetsByBrowseOrder', () => {
        contract.compareSets.forEach(({ a, b, sign }) => {
            it(`orders ${a.name} vs ${b.name} as ${sign}`, () => {
                expect(Math.sign(compareSetsByBrowseOrder(a, b))).toBe(sign);
            });
        });
    });
});
