import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CardPanel from '../../src/components/ui/CardPanel.jsx';
import { ThemeModeProvider } from '../../src/contexts/ThemeContext.jsx';

// Stub the child list so we only exercise CardPanel's own behavior: rendering
// the title and forwarding props down to CardList.
let receivedProps = null;
jest.mock('../../src/components/ui/CardList.jsx', () => (props) => {
  receivedProps = props;
  return <div data-testid="card-list">{props.cards.length} cards</div>;
});

const renderPanel = (props = {}) => {
  const merged = {
    cards: [{ name: 'Card A', price: 10, quantity: 1 }],
    cardOptions: [],
    inputValue: '',
    onInputChange: jest.fn(),
    onAddCard: jest.fn(),
    onRemoveCard: jest.fn(),
    onUpdateQuantity: jest.fn(),
    title: 'Cards I Want',
    ...props,
  };
  render(
    <ThemeProvider theme={createTheme()}>
      <ThemeModeProvider>
        <CardPanel {...merged} />
      </ThemeModeProvider>
    </ThemeProvider>
  );
  return merged;
};

describe('CardPanel', () => {
  beforeEach(() => {
    receivedProps = null;
  });

  test('renders the panel title', () => {
    renderPanel({ title: 'Cards I Want' });
    expect(screen.getByText('Cards I Want')).toBeInTheDocument();
  });

  test('renders the CardList child', () => {
    renderPanel();
    expect(screen.getByTestId('card-list')).toBeInTheDocument();
  });

  test('forwards the relevant props to CardList', () => {
    const merged = renderPanel();
    expect(receivedProps.cards).toBe(merged.cards);
    expect(receivedProps.title).toBe('Cards I Want');
    expect(receivedProps.onAddCard).toBe(merged.onAddCard);
    expect(receivedProps.onRemoveCard).toBe(merged.onRemoveCard);
    expect(receivedProps.onUpdateQuantity).toBe(merged.onUpdateQuantity);
  });
});
