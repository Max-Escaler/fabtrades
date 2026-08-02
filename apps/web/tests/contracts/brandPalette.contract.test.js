import contract from '../../../../packages/contracts/brand_palette.json';

describe('brand palette contract', () => {
    it('pins the mobile AppTheme / web ThemeContext tokens', () => {
        expect(contract.tokens).toEqual({
            brown: '#8B4513',
            brownBright: '#A0643F',
            brownDeep: '#5D2F0D',
            tan: '#D4A574',
            tanBright: '#E4C09C',
            tanDeep: '#A8824E',
            cream: '#F5F1ED',
            espresso: '#2C1810',
            espressoDeep: '#1A0F0A',
        });
    });
});
