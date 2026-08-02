import {
    TRADE_DRAFT_KEY,
    addCardToTradeDraft,
    loadTradeDraft,
    saveTradeDraft,
} from '../../src/utils/tradeDraft.js';

describe('tradeDraft', () => {
    let store;

    beforeEach(() => {
        store = {};
        Object.defineProperty(global, 'localStorage', {
            configurable: true,
            value: {
                getItem: jest.fn((key) =>
                    Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null,
                ),
                setItem: jest.fn((key, value) => {
                    store[key] = String(value);
                }),
                removeItem: jest.fn((key) => {
                    delete store[key];
                }),
                clear: jest.fn(() => {
                    store = {};
                }),
            },
        });
    });

    test('saveTradeDraft + loadTradeDraft round-trips minimal fields', () => {
        saveTradeDraft(
            [{ uniqueId: 'a-1', name: 'Alpha', subTypeName: 'Normal', quantity: 2, price: 3.5 }],
            [{ uniqueId: 'b-1', name: 'Beta', subTypeName: 'Rainbow Foil', quantity: 1, price: 10 }],
        );

        expect(store[TRADE_DRAFT_KEY]).toBeTruthy();

        const draft = loadTradeDraft();
        expect(draft.have).toEqual([
            { uniqueId: 'a-1', name: 'Alpha', subTypeName: 'Normal', quantity: 2, price: 3.5 },
        ]);
        expect(draft.want).toEqual([
            {
                uniqueId: 'b-1',
                name: 'Beta',
                subTypeName: 'Rainbow Foil',
                quantity: 1,
                price: 10,
            },
        ]);
    });

    test('addCardToTradeDraft appends then bumps quantity on the want side', () => {
        addCardToTradeDraft('want', {
            uniqueId: 'c-1',
            name: 'Gamma',
            subTypeName: 'Normal',
            quantity: 1,
            price: 4,
        });
        addCardToTradeDraft('want', {
            uniqueId: 'c-1',
            name: 'Gamma',
            subTypeName: 'Normal',
            quantity: 1,
            price: 4,
        });

        const draft = loadTradeDraft();
        expect(draft.have).toEqual([]);
        expect(draft.want).toHaveLength(1);
        expect(draft.want[0].quantity).toBe(2);
    });

    test('addCardToTradeDraft caps quantity at 6', () => {
        addCardToTradeDraft('have', {
            uniqueId: 'd-1',
            name: 'Delta',
            quantity: 6,
            price: 1,
        });
        addCardToTradeDraft('have', {
            uniqueId: 'd-1',
            name: 'Delta',
            quantity: 3,
            price: 1,
        });

        expect(loadTradeDraft().have[0].quantity).toBe(6);
    });
});
