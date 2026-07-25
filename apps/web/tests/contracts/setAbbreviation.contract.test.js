// Contract tests for set-code resolution.
//
// These assert the shared fixtures in packages/contracts, which the Dart
// implementation in apps/mobile is held to as well. See
// packages/contracts/README.md.
import contract from '../../../../packages/contracts/set_abbreviation.json';
import {
    getPrimaryCollectorNumber,
    collectorNumberPrefix,
    deriveSetAbbreviation,
    resolveSetAbbreviation,
} from '../../src/utils/setAbbreviation.js';

describe('set abbreviation contract', () => {
    describe('getPrimaryCollectorNumber', () => {
        contract.primaryCollectorNumber.forEach(({ input, expected }) => {
            it(`maps ${JSON.stringify(input)} to ${JSON.stringify(expected)}`, () => {
                expect(getPrimaryCollectorNumber(input)).toBe(expected);
            });
        });
    });

    describe('collectorNumberPrefix', () => {
        contract.collectorNumberPrefix.forEach(({ input, expected }) => {
            it(`maps ${JSON.stringify(input)} to ${JSON.stringify(expected)}`, () => {
                expect(collectorNumberPrefix(input)).toBe(expected);
            });
        });
    });

    describe('deriveSetAbbreviation', () => {
        contract.deriveSetAbbreviation.forEach(({ collectorNumbers, expected }) => {
            it(`derives ${JSON.stringify(expected)} from ${collectorNumbers.length} numbers`, () => {
                expect(deriveSetAbbreviation(collectorNumbers)).toBe(expected);
            });
        });
    });

    describe('resolveSetAbbreviation', () => {
        contract.resolveSetAbbreviation.forEach(({ provided, collectorNumbers, expected }) => {
            it(`resolves ${JSON.stringify(provided)} to ${JSON.stringify(expected)}`, () => {
                expect(resolveSetAbbreviation(provided, collectorNumbers)).toBe(expected);
            });
        });
    });
});
