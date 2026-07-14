import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import TradeSummary from '../../src/components/elements/TradeSummary.jsx';
import { PriceProvider } from '../../src/contexts/PriceContext.jsx';
import { ThemeModeProvider } from '../../src/contexts/ThemeContext.jsx';

// saveTradeToHistory reaches into Supabase, so stub the service and control its
// resolved value per-test. AuthContext imports the Supabase client (which relies
// on import.meta and cannot be parsed by the jest transform), so mock the hook
// and expose a mutable `user` to exercise the signed-in / signed-out branches.
import { saveTradeToHistory } from '../../src/services/tradeHistory.js';

jest.mock('../../src/services/tradeHistory.js', () => ({
  saveTradeToHistory: jest.fn(),
}));

let mockUser = null;
jest.mock('../../src/contexts/AuthContext.jsx', () => ({
  useAuth: () => ({ user: mockUser }),
}));

const renderSummary = (props = {}) => {
  const merged = {
    haveList: [{ name: 'Card A', price: 10, quantity: 1 }],
    wantList: [{ name: 'Card B', price: 5, quantity: 1 }],
    haveTotal: 10,
    wantTotal: 5,
    diff: 5,
    clearURLTradeData: jest.fn(),
    urlTradeData: null,
    hasLoadedFromURL: false,
    ...props,
  };
  render(
    <ThemeProvider theme={createTheme()}>
      <ThemeModeProvider>
        <PriceProvider>
          <TradeSummary {...merged} />
        </PriceProvider>
      </ThemeModeProvider>
    </ThemeProvider>
  );
  return merged;
};

describe('TradeSummary', () => {
  beforeEach(() => {
    mockUser = null;
    saveTradeToHistory.mockReset();
    localStorage.clear();
  });

  describe('card count aggregation', () => {
    test('sums quantities for the have and want lists', () => {
      renderSummary({
        haveList: [
          { name: 'Card A', price: 10, quantity: 2 },
          { name: 'Card B', price: 5, quantity: 3 },
        ],
        wantList: [{ name: 'Card C', price: 5, quantity: 4 }],
      });
      expect(screen.getByText('My 5 cards')).toBeInTheDocument();
      expect(screen.getByText('Their 4 cards')).toBeInTheDocument();
    });

    test('treats a missing quantity as a single card', () => {
      renderSummary({
        haveList: [{ name: 'Card A', price: 10 }],
        wantList: [{ name: 'Card B', price: 5 }, { name: 'Card C', price: 2 }],
      });
      expect(screen.getByText('My 1 cards')).toBeInTheDocument();
      expect(screen.getByText('Their 2 cards')).toBeInTheDocument();
    });
  });

  describe('difference formatting', () => {
    test('prefixes a positive difference with a plus sign', () => {
      renderSummary({ diff: 5 });
      expect(screen.getByText('+$5')).toBeInTheDocument();
    });

    test('renders a negative difference without an added plus sign', () => {
      renderSummary({ diff: -3 });
      expect(screen.getByText('-$3')).toBeInTheDocument();
    });

    test('renders a zero difference as a plain amount', () => {
      renderSummary({ diff: 0 });
      expect(screen.getByText('$0')).toBeInTheDocument();
    });
  });

  describe('stale trade warning', () => {
    test('does not warn for recently created url trades', () => {
      renderSummary({ urlTradeData: { ageInDays: 3 } });
      expect(screen.queryByText(/Trade data is/)).not.toBeInTheDocument();
    });

    test('formats an age of a couple of weeks', () => {
      renderSummary({ urlTradeData: { ageInDays: 14 } });
      expect(screen.getByText('Trade data is 2 weeks old')).toBeInTheDocument();
    });

    test('uses the singular week label just past the one-week threshold', () => {
      renderSummary({ urlTradeData: { ageInDays: 8 } });
      expect(screen.getByText('Trade data is 1 week old')).toBeInTheDocument();
    });

    test('formats an age of a couple of months', () => {
      renderSummary({ urlTradeData: { ageInDays: 60 } });
      expect(screen.getByText('Trade data is 2 months old')).toBeInTheDocument();
    });
  });

  describe('save button availability', () => {
    test('is disabled when no user is signed in', () => {
      mockUser = null;
      renderSummary();
      expect(screen.getByRole('button', { name: /Save Trade/ })).toBeDisabled();
    });

    test('is disabled for a signed-in user with an empty trade', () => {
      mockUser = { id: 'user-1' };
      renderSummary({ haveList: [], wantList: [] });
      expect(screen.getByRole('button', { name: /Save Trade/ })).toBeDisabled();
    });

    test('is enabled for a signed-in user with cards', () => {
      mockUser = { id: 'user-1' };
      renderSummary();
      expect(screen.getByRole('button', { name: /Save Trade/ })).toBeEnabled();
    });
  });

  describe('saving a trade', () => {
    test('sends the lists, totals and derived name, then confirms success', async () => {
      mockUser = { id: 'user-1' };
      saveTradeToHistory.mockResolvedValue({ error: null });
      const props = renderSummary({
        haveList: [{ name: 'Card A', price: 10, quantity: 1 }],
        wantList: [
          { name: 'Card B', price: 5, quantity: 1 },
          { name: 'Card C', price: 2, quantity: 1 },
        ],
        haveTotal: 10,
        wantTotal: 7,
        diff: 3,
      });

      fireEvent.click(screen.getByRole('button', { name: /Save Trade/ }));

      await waitFor(() => expect(saveTradeToHistory).toHaveBeenCalledTimes(1));
      expect(saveTradeToHistory).toHaveBeenCalledWith(
        'traded +2, -1 cards',
        props.haveList,
        props.wantList,
        { haveTotal: 10, wantTotal: 7, diff: 3 }
      );
      expect(await screen.findByText('Trade saved to your history!')).toBeInTheDocument();
    });

    test('surfaces a save failure through an alert', async () => {
      mockUser = { id: 'user-1' };
      saveTradeToHistory.mockResolvedValue({ error: { message: 'db down' } });
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

      renderSummary();
      fireEvent.click(screen.getByRole('button', { name: /Save Trade/ }));

      await waitFor(() =>
        expect(alertSpy).toHaveBeenCalledWith('Failed to save trade: db down')
      );
      expect(screen.queryByText('Trade saved to your history!')).not.toBeInTheDocument();
      alertSpy.mockRestore();
    });

    test('falls back to a generic message when the error has no message', async () => {
      mockUser = { id: 'user-1' };
      saveTradeToHistory.mockResolvedValue({ error: {} });
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

      renderSummary();
      fireEvent.click(screen.getByRole('button', { name: /Save Trade/ }));

      await waitFor(() =>
        expect(alertSpy).toHaveBeenCalledWith('Failed to save trade: Unknown error')
      );
      alertSpy.mockRestore();
    });
  });

  describe('clearing url trade data', () => {
    test('hides the clear control when no url trade is loaded', () => {
      renderSummary({ hasLoadedFromURL: false, urlTradeData: null });
      expect(
        screen.queryByRole('button', { name: /Clear loaded trade data from URL/i })
      ).not.toBeInTheDocument();
    });

    test('confirms before clearing loaded url trade data', () => {
      const props = renderSummary({
        hasLoadedFromURL: true,
        urlTradeData: { ageInDays: 1 },
      });

      fireEvent.click(
        screen.getByRole('button', { name: /Clear loaded trade data from URL/i })
      );
      expect(screen.getByText('Clear Loaded Trade Data?')).toBeInTheDocument();
      expect(props.clearURLTradeData).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
      expect(props.clearURLTradeData).toHaveBeenCalledTimes(1);
    });

    test('cancelling the dialog leaves the loaded trade untouched', () => {
      const props = renderSummary({
        hasLoadedFromURL: true,
        urlTradeData: { ageInDays: 1 },
      });

      fireEvent.click(
        screen.getByRole('button', { name: /Clear loaded trade data from URL/i })
      );
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(props.clearURLTradeData).not.toHaveBeenCalled();
    });
  });

  describe('price type toggle', () => {
    test('selects the low price option when chosen', () => {
      renderSummary();
      const marketButton = screen.getByRole('button', { name: 'market price' });
      const lowButton = screen.getByRole('button', { name: 'low price' });
      expect(marketButton).toHaveAttribute('aria-pressed', 'true');

      fireEvent.click(lowButton);
      expect(lowButton).toHaveAttribute('aria-pressed', 'true');
      expect(marketButton).toHaveAttribute('aria-pressed', 'false');
    });

    test('ignores a click that would deselect the active option', () => {
      renderSummary();
      const marketButton = screen.getByRole('button', { name: 'market price' });

      fireEvent.click(marketButton);
      expect(marketButton).toHaveAttribute('aria-pressed', 'true');
    });
  });
});
