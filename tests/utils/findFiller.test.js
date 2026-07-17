import {
    getFillerContext,
    findFillerMatches,
    closenessLabel,
    cardToTradeOption,
} from '../../src/utils/findFiller.js';

describe('getFillerContext', () => {
    test('treats near-zero diffs as balanced', () => {
        expect(getFillerContext(0).balanced).toBe(true);
        expect(getFillerContext(0.005).balanced).toBe(true);
    });

    test('when want is ahead (negative diff), fills have/my side', () => {
        const ctx = getFillerContext(-4.5);
        expect(ctx.balanced).toBe(false);
        expect(ctx.target).toBe(4.5);
        expect(ctx.fillSide).toBe('have');
        expect(ctx.sideIsMine).toBe(true);
    });

    test('when have is ahead (positive diff), fills want/their side', () => {
        const ctx = getFillerContext(3.25);
        expect(ctx.fillSide).toBe('want');
        expect(ctx.sideIsMine).toBe(false);
        expect(ctx.target).toBe(3.25);
    });
});

describe('findFillerMatches', () => {
    const cards = [
        { name: 'Cheap', marketPrice: 1, lowPrice: 0.5 },
        { name: 'Exact', marketPrice: 4.5, lowPrice: 4 },
        { name: 'Near', marketPrice: 5, lowPrice: 4.25 },
        { name: 'Far', marketPrice: 20, lowPrice: 18 },
        { name: 'Free', marketPrice: 0, lowPrice: 0 },
        { name: 'Missing', marketPrice: null, lowPrice: null },
    ];

    test('ranks by absolute distance to target using market price and caps results', () => {
        const matches = findFillerMatches(cards, 4.5, 3);
        expect(matches).toHaveLength(3);
        expect(matches.map((m) => m.card.name)).toEqual(['Exact', 'Near', 'Cheap']);
        expect(matches[0].gapDistance).toBe(0);
        expect(matches[1].gapDistance).toBeCloseTo(0.5);
        expect(matches[0].price).toBe(4.5);
    });

    test('skips unpriced cards and returns empty for invalid inputs', () => {
        expect(findFillerMatches(cards, 4.5).some((m) => m.card.name === 'Free')).toBe(false);
        expect(findFillerMatches([], 4.5)).toEqual([]);
        expect(findFillerMatches(cards, 0)).toEqual([]);
    });
});

describe('closenessLabel', () => {
    const money = (n) => `$${n.toFixed(2)}`;

    test('labels exact / over / under', () => {
        expect(closenessLabel({ price: 4.5, gapDistance: 0 }, 4.5, money)).toBe('Exact match');
        expect(closenessLabel({ price: 5, gapDistance: 0.5 }, 4.5, money)).toBe('$0.50 over');
        expect(closenessLabel({ price: 4, gapDistance: 0.5 }, 4.5, money)).toBe('$0.50 under');
    });
});

describe('cardToTradeOption', () => {
    test('maps catalog card fields into the addCard option shape', () => {
        const card = {
            displayName: 'Zap (Yellow)',
            name: 'Zap',
            _uniqueDisplayId: 'zap-y',
            _uniqueId: 'zap-y-id',
            subTypeName: 'Normal',
            _setName: 'Welcome to Rathe',
        };
        expect(cardToTradeOption(card)).toEqual({
            label: 'Zap (Yellow)',
            value: 'zap-y',
            subTypeName: 'Normal',
            setName: 'Welcome to Rathe',
            card,
        });
    });
});
