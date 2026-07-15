import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { ThemeModeProvider } from '../../src/contexts/ThemeContext.jsx';
import SearchOption from '../../src/components/search/SearchOption.jsx';

// The thumbnail pulls in image loading / portals we don't care about here.
jest.mock('../../src/components/ui/CardImagePreview.jsx', () => ({
  CardThumbnail: () => <div data-testid="thumb" />,
  CardImageModal: () => null,
}));

// Control the price source so both the USD and Cardmarket (EUR) formatting
// branches can be exercised deterministically.
let mockPriceSource = 'tcgplayer';
jest.mock('../../src/contexts/PriceContext.jsx', () => ({
  usePriceType: () => ({ priceSource: mockPriceSource }),
}));

const renderOption = (option, props = {}) =>
  render(
    <ThemeProvider theme={createTheme()}>
      <ThemeModeProvider>
        <SearchOption option={option} {...props} />
      </ThemeModeProvider>
    </ThemeProvider>
  );

beforeEach(() => {
  mockPriceSource = 'tcgplayer';
});

describe('SearchOption', () => {
  test('renders the card label', () => {
    renderOption({ label: 'Alpha Strike', subTypeName: 'Normal', card: {} });
    expect(screen.getByText('Alpha Strike')).toBeInTheDocument();
  });

  test('formats the TCGplayer price in USD from marketPrice', () => {
    renderOption({ label: 'Alpha Strike', subTypeName: 'Normal', card: { marketPrice: 10 } });
    expect(screen.getByText('$10')).toBeInTheDocument();
  });

  test('falls back to lowPrice when marketPrice is absent', () => {
    renderOption({ label: 'Alpha Strike', subTypeName: 'Normal', card: { lowPrice: 7 } });
    expect(screen.getByText('$7')).toBeInTheDocument();
  });

  test('shows $0 when the card has no price data', () => {
    renderOption({ label: 'Alpha Strike', subTypeName: 'Normal', card: {} });
    expect(screen.getByText('$0')).toBeInTheDocument();
  });

  test('formats the price in EUR when the price source is cardmarket', () => {
    mockPriceSource = 'cardmarket';
    renderOption({
      label: 'Alpha Strike',
      subTypeName: 'Normal',
      card: { marketPrice: 10, cardmarketTrend: 8 },
    });
    const euroPrice = screen.getByText((content) => content.includes('€'));
    expect(euroPrice).toBeInTheDocument();
    expect(euroPrice.textContent).toContain('8');
    // The USD market price must NOT be shown when using cardmarket.
    expect(screen.queryByText('$10')).not.toBeInTheDocument();
  });

  test('renders a type chip for a non-normal subtype', () => {
    renderOption({ label: 'Alpha Strike', subTypeName: 'Rainbow Foil', card: {} });
    expect(screen.getByText('Rainbow Foil')).toBeInTheDocument();
  });

  test('does not render a type chip for Normal cards', () => {
    renderOption({ label: 'Alpha Strike', subTypeName: 'Normal', card: {} });
    // "Normal" maps to no badge; only the label should be present.
    expect(screen.queryByText('Normal')).not.toBeInTheDocument();
  });

  test('renders the set name when provided', () => {
    renderOption({ label: 'Alpha Strike', subTypeName: 'Normal', setName: 'Welcome to Rathe', card: {} });
    expect(screen.getByText('Welcome to Rathe')).toBeInTheDocument();
  });

  test('fires onClick when the option is clicked', () => {
    const onClick = jest.fn();
    renderOption({ label: 'Alpha Strike', subTypeName: 'Normal', card: {} }, { onClick });
    fireEvent.click(screen.getByText('Alpha Strike'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test('fires onMouseEnter when hovered', () => {
    const onMouseEnter = jest.fn();
    renderOption({ label: 'Alpha Strike', subTypeName: 'Normal', card: {} }, { onMouseEnter });
    fireEvent.mouseEnter(screen.getByText('Alpha Strike'));
    expect(onMouseEnter).toHaveBeenCalledTimes(1);
  });

  test('renders each label segment when a search term highlights part of it', () => {
    renderOption(
      { label: 'Alpha Strike', subTypeName: 'Normal', card: {} },
      { searchTerm: 'strike' }
    );
    // highlightMatch splits the label into a plain segment and a highlighted
    // one, rendered as separate spans; both parts must still appear.
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Strike')).toBeInTheDocument();
  });
});
