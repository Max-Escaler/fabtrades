import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CardList from '../../src/components/ui/CardList.jsx';
import { PriceProvider } from '../../src/contexts/PriceContext.jsx';
import { ThemeModeProvider } from '../../src/contexts/ThemeContext.jsx';

jest.mock('../../src/components/ui/CardImagePreview.jsx', () => ({
  CardThumbnail: () => <div data-testid="thumb" />,
  CardImageModal: () => null,
}));

const cards = [
  { name: 'Card A', price: 10, quantity: 1, subTypeName: 'Normal' },
  { name: 'Card B', price: 25, quantity: 2, subTypeName: 'Rainbow Foil' },
];

const renderList = (props = {}) => {
  const merged = {
    cards,
    onRemoveCard: jest.fn(),
    onUpdateQuantity: jest.fn(),
    ...props,
  };
  const utils = render(
    <ThemeProvider theme={createTheme()}>
      <ThemeModeProvider>
        <PriceProvider>
          <CardList {...merged} />
        </PriceProvider>
      </ThemeModeProvider>
    </ThemeProvider>
  );
  return { ...utils, props: merged };
};

describe('CardList', () => {
  test('renders each card name', () => {
    renderList();
    expect(screen.getByText('Card A')).toBeInTheDocument();
    expect(screen.getByText('Card B')).toBeInTheDocument();
  });

  test('renders formatted prices for cards', () => {
    renderList();
    expect(screen.getByText('$10')).toBeInTheDocument();
    expect(screen.getByText('$25')).toBeInTheDocument();
  });

  test('calls onRemoveCard with the card index when delete is clicked', () => {
    const { props } = renderList();
    fireEvent.click(screen.getByRole('button', { name: 'Delete Card B' }));
    expect(props.onRemoveCard).toHaveBeenCalledWith(1);
  });

  test('renders an empty list without cards', () => {
    renderList({ cards: [] });
    expect(screen.queryByText('Card A')).not.toBeInTheDocument();
    expect(screen.getByText(/Search above to add cards/i)).toBeInTheDocument();
  });

  test('renders grid tiles with preview buttons when viewMode is grid', () => {
    renderList({ viewMode: 'grid' });
    expect(screen.getByText('Card A')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Preview Card A' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete Card B' })).toBeInTheDocument();
  });
});
