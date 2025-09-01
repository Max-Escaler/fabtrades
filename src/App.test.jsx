import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import App from './App';
import { CardDataProvider } from './inputs/cardDataProvider';

// Mock the CardDataProvider to return test data
const mockCardData = {
  cardGroups: [
    {
      name: 'Test Card 1',
      editions: [
        { subTypeName: '1st Edition', cardPrice: 10.00, productId: '1' },
        { subTypeName: '2nd Edition', cardPrice: 15.00, productId: '2' }
      ]
    },
    {
      name: 'Test Card 2',
      editions: [
        { subTypeName: '1st Edition', cardPrice: 20.00, productId: '3' }
      ]
    }
  ],
  loading: false,
  dataReady: true,
  error: null,
  usingLocalFiles: false
};

// Mock the useCardData hook
jest.mock('./inputs/cardDataProvider', () => ({
  ...jest.requireActual('./inputs/cardDataProvider'),
  useCardData: () => mockCardData
}));

const theme = createTheme();

const renderWithProviders = (component) => {
  return render(
    <ThemeProvider theme={theme}>
      <CardDataProvider>
        {component}
      </CardDataProvider>
    </ThemeProvider>
  );
};

describe('App Component', () => {
  beforeEach(() => {
    // Clear any previous test data
    localStorage.clear();
  });

  describe('Initial Rendering', () => {
    test('renders FAB Trades header', () => {
      renderWithProviders(<App />);
      expect(screen.getByText('FAB Trades')).toBeInTheDocument();
    });

    test('renders both card panels', () => {
      renderWithProviders(<App />);
      expect(screen.getByText('Cards I Have')).toBeInTheDocument();
      expect(screen.getByText('Cards I Want')).toBeInTheDocument();
    });

    test('renders search inputs in both panels', () => {
      renderWithProviders(<App />);
      const searchInputs = screen.getAllByLabelText('Search Cards');
      expect(searchInputs).toHaveLength(2);
    });

    test('renders Add Card buttons in both panels', () => {
      renderWithProviders(<App />);
      const addButtons = screen.getAllByText('Add Card');
      expect(addButtons).toHaveLength(2);
    });
  });

  describe('Card Addition Functionality', () => {
    test('can add a card to the "Cards I Have" panel', async () => {
      renderWithProviders(<App />);
      
      const haveSearchInput = screen.getAllByLabelText('Search Cards')[0];
      const haveAddButton = screen.getAllByText('Add Card')[0];
      
      // Type card name
      fireEvent.change(haveSearchInput, { target: { value: 'Test Card 1' } });
      
      // Click add button
      fireEvent.click(haveAddButton);
      
      // Wait for card to appear
      await waitFor(() => {
        expect(screen.getByText('Test Card 1')).toBeInTheDocument();
      });
    });

    test('can add a card to the "Cards I Want" panel', async () => {
      renderWithProviders(<App />);
      
      const wantSearchInput = screen.getAllByLabelText('Search Cards')[1];
      const wantAddButton = screen.getAllByText('Add Card')[1];
      
      // Type card name
      fireEvent.change(wantSearchInput, { target: { value: 'Test Card 2' } });
      
      // Click add button
      fireEvent.click(wantAddButton);
      
      // Wait for card to appear
      await waitFor(() => {
        expect(screen.getByText('Test Card 2')).toBeInTheDocument();
      });
    });

    test('prevents adding duplicate cards to the same panel', async () => {
      renderWithProviders(<App />);
      
      const haveSearchInput = screen.getAllByLabelText('Search Cards')[0];
      const haveAddButton = screen.getAllByText('Add Card')[0];
      
      // Add first card
      fireEvent.change(haveSearchInput, { target: { value: 'Test Card 1' } });
      fireEvent.click(haveAddButton);
      
      // Try to add same card again
      fireEvent.change(haveSearchInput, { target: { value: 'Test Card 1' } });
      fireEvent.click(haveAddButton);
      
      // Should only have one instance
      await waitFor(() => {
        const cardInstances = screen.getAllByText('Test Card 1');
        expect(cardInstances).toHaveLength(1);
      });
    });

    test('adds cards with default quantity of 1', async () => {
      renderWithProviders(<App />);
      
      const haveSearchInput = screen.getAllByLabelText('Search Cards')[0];
      const haveAddButton = screen.getAllByText('Add Card')[0];
      
      fireEvent.change(haveSearchInput, { target: { value: 'Test Card 1' } });
      fireEvent.click(haveAddButton);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('1')).toBeInTheDocument();
      });
    });
  });

  describe('Card Removal Functionality', () => {
    test('can remove a card from the "Cards I Have" panel', async () => {
      renderWithProviders(<App />);
      
      // Add a card first
      const haveSearchInput = screen.getAllByLabelText('Search Cards')[0];
      const haveAddButton = screen.getAllByText('Add Card')[0];
      
      fireEvent.change(haveSearchInput, { target: { value: 'Test Card 1' } });
      fireEvent.click(haveAddButton);
      
      // Wait for card to appear
      await waitFor(() => {
        expect(screen.getByText('Test Card 1')).toBeInTheDocument();
      });
      
      // Find and click delete button
      const deleteButton = screen.getByTestId('delete-button-0') || screen.getByRole('button', { name: /delete/i });
      fireEvent.click(deleteButton);
      
      // Card should be removed
      await waitFor(() => {
        expect(screen.queryByText('Test Card 1')).not.toBeInTheDocument();
      });
    });

    test('can remove a card from the "Cards I Want" panel', async () => {
      renderWithProviders(<App />);
      
      // Add a card first
      const wantSearchInput = screen.getAllByLabelText('Search Cards')[1];
      const wantAddButton = screen.getAllByText('Add Card')[1];
      
      fireEvent.change(wantSearchInput, { target: { value: 'Test Card 2' } });
      fireEvent.click(wantAddButton);
      
      // Wait for card to appear
      await waitFor(() => {
        expect(screen.getByText('Test Card 2')).toBeInTheDocument();
      });
      
      // Find and click delete button
      const deleteButton = screen.getByTestId('delete-button-0') || screen.getByRole('button', { name: /delete/i });
      fireEvent.click(deleteButton);
      
      // Card should be removed
      await waitFor(() => {
        expect(screen.queryByText('Test Card 2')).not.toBeInTheDocument();
      });
    });
  });

  describe('Quantity Management', () => {
    test('can change card quantity using dropdown', async () => {
      renderWithProviders(<App />);
      
      // Add a card first
      const haveSearchInput = screen.getAllByLabelText('Search Cards')[0];
      const haveAddButton = screen.getAllByText('Add Card')[0];
      
      fireEvent.change(haveSearchInput, { target: { value: 'Test Card 1' } });
      fireEvent.click(haveAddButton);
      
      await waitFor(() => {
        expect(screen.getByText('Test Card 1')).toBeInTheDocument();
      });
      
      // Find quantity dropdown and change value
      const quantityDropdown = screen.getByDisplayValue('1');
      fireEvent.mouseDown(quantityDropdown);
      
      // Select quantity 3
      const option3 = screen.getByText('3');
      fireEvent.click(option3);
      
      // Quantity should be updated
      expect(screen.getByDisplayValue('3')).toBeInTheDocument();
    });

    test('quantity changes affect total calculations', async () => {
      renderWithProviders(<App />);
      
      // Add a card first
      const haveSearchInput = screen.getAllByLabelText('Search Cards')[0];
      const haveAddButton = screen.getAllByText('Add Card')[0];
      
      fireEvent.change(haveSearchInput, { target: { value: 'Test Card 1' } });
      fireEvent.click(haveAddButton);
      
      await waitFor(() => {
        expect(screen.getByText('Test Card 1')).toBeInTheDocument();
      });
      
      // Initial total should be $10.00 (1 × $10.00)
      expect(screen.getByText('Total: $10.00')).toBeInTheDocument();
      
      // Change quantity to 3
      const quantityDropdown = screen.getByDisplayValue('1');
      fireEvent.mouseDown(quantityDropdown);
      const option3 = screen.getByText('3');
      fireEvent.click(option3);
      
      // Total should now be $30.00 (3 × $10.00)
      await waitFor(() => {
        expect(screen.getByText('Total: $30.00')).toBeInTheDocument();
      });
    });
  });

  describe('Edition Management', () => {
    test('can change card edition by clicking on card', async () => {
      renderWithProviders(<App />);
      
      // Add a card first
      const haveSearchInput = screen.getAllByLabelText('Search Cards')[0];
      const haveAddButton = screen.getAllByText('Add Card')[0];
      
      fireEvent.change(haveSearchInput, { target: { value: 'Test Card 1' } });
      fireEvent.click(haveAddButton);
      
      await waitFor(() => {
        expect(screen.getByText('Test Card 1')).toBeInTheDocument();
      });
      
      // Click on the card to open edition picker
      const cardItem = screen.getByText('Test Card 1').closest('li');
      fireEvent.click(cardItem);
      
      // Edition picker should open
      await waitFor(() => {
        expect(screen.getByText('Select Edition')).toBeInTheDocument();
      });
    });

    test('edition change updates price', async () => {
      renderWithProviders(<App />);
      
      // Add a card first
      const haveSearchInput = screen.getAllByLabelText('Search Cards')[0];
      const haveAddButton = screen.getAllByText('Add Card')[0];
      
      fireEvent.change(haveSearchInput, { target: { value: 'Test Card 1' } });
      fireEvent.click(haveAddButton);
      
      await waitFor(() => {
        expect(screen.getByText('Test Card 1')).toBeInTheDocument();
      });
      
      // Initial price should be $10.00 (1st Edition)
      expect(screen.getByText('$10.00')).toBeInTheDocument();
      
      // Click on card to change edition
      const cardItem = screen.getByText('Test Card 1').closest('li');
      fireEvent.click(cardItem);
      
      // Select 2nd Edition
      await waitFor(() => {
        const option2nd = screen.getByText('2nd Edition');
        fireEvent.click(option2nd);
      });
      
      // Price should now be $15.00 (2nd Edition)
      await waitFor(() => {
        expect(screen.getByText('$15.00')).toBeInTheDocument();
      });
    });
  });

  describe('Total Calculations', () => {
    test('calculates correct totals with quantities', async () => {
      renderWithProviders(<App />);
      
      // Add two cards with different quantities
      const haveSearchInput = screen.getAllByLabelText('Search Cards')[0];
      const haveAddButton = screen.getAllByText('Add Card')[0];
      
      // Add first card
      fireEvent.change(haveSearchInput, { target: { value: 'Test Card 1' } });
      fireEvent.click(haveAddButton);
      
      // Add second card
      fireEvent.change(haveSearchInput, { target: { value: 'Test Card 2' } });
      fireEvent.click(haveAddButton);
      
      await waitFor(() => {
        expect(screen.getByText('Test Card 1')).toBeInTheDocument();
        expect(screen.getByText('Test Card 2')).toBeInTheDocument();
      });
      
      // Change quantities
      const quantityDropdowns = screen.getAllByDisplayValue('1');
      
      // Change first card to quantity 2
      fireEvent.mouseDown(quantityDropdowns[0]);
      fireEvent.click(screen.getByText('2'));
      
      // Change second card to quantity 3
      fireEvent.mouseDown(quantityDropdowns[1]);
      fireEvent.click(screen.getByText('3'));
      
      // Total should be (2 × $10.00) + (3 × $20.00) = $80.00
      await waitFor(() => {
        expect(screen.getByText('Total: $80.00')).toBeInTheDocument();
      });
    });

    test('trade differential calculation is correct', async () => {
      renderWithProviders(<App />);
      
      // Add card to "Cards I Have"
      const haveSearchInput = screen.getAllByLabelText('Search Cards')[0];
      const haveAddButton = screen.getAllByText('Add Card')[0];
      
      fireEvent.change(haveSearchInput, { target: { value: 'Test Card 1' } });
      fireEvent.click(haveAddButton);
      
      // Add card to "Cards I Want"
      const wantSearchInput = screen.getAllByLabelText('Search Cards')[1];
      const wantAddButton = screen.getAllByText('Add Card')[1];
      
      fireEvent.change(wantSearchInput, { target: { value: 'Test Card 2' } });
      fireEvent.click(wantAddButton);
      
      await waitFor(() => {
        expect(screen.getByText('Test Card 1')).toBeInTheDocument();
        expect(screen.getByText('Test Card 2')).toBeInTheDocument();
      });
      
      // Trade differential should show: $10.00 - $20.00 = -$10.00
      await waitFor(() => {
        expect(screen.getByText('-$10.00')).toBeInTheDocument();
      });
    });
  });

  describe('Trade Summary Section', () => {
    test('shows trade summary when cards are present', async () => {
      renderWithProviders(<App />);
      
      // Add cards to both panels
      const haveSearchInput = screen.getAllByLabelText('Search Cards')[0];
      const haveAddButton = screen.getAllByText('Add Card')[0];
      
      fireEvent.change(haveSearchInput, { target: { value: 'Test Card 1' } });
      fireEvent.click(haveAddButton);
      
      const wantSearchInput = screen.getAllByLabelText('Search Cards')[1];
      const wantAddButton = screen.getAllByText('Add Card')[1];
      
      fireEvent.change(wantSearchInput, { target: { value: 'Test Card 2' } });
      fireEvent.click(wantAddButton);
      
      await waitFor(() => {
        expect(screen.getByText('My 1 cards')).toBeInTheDocument();
        expect(screen.getByText('Their 1 cards')).toBeInTheDocument();
        expect(screen.getByText('Current Value')).toBeInTheDocument();
      });
    });

    test('hides trade summary when no cards are present', () => {
      renderWithProviders(<App />);
      
      expect(screen.queryByText('My 0 cards')).not.toBeInTheDocument();
      expect(screen.queryByText('Their 0 cards')).not.toBeInTheDocument();
      expect(screen.queryByText('Current Value')).not.toBeInTheDocument();
    });
  });

  describe('Input Validation', () => {
    test('prevents adding empty card names', () => {
      renderWithProviders(<App />);
      
      const haveAddButton = screen.getAllByText('Add Card')[0];
      
      // Try to add without entering a name
      fireEvent.click(haveAddButton);
      
      // No cards should be added
      expect(screen.queryByText('Test Card')).not.toBeInTheDocument();
    });

    test('prevents adding cards that dont exist in card data', () => {
      renderWithProviders(<App />);
      
      const haveSearchInput = screen.getAllByLabelText('Search Cards')[0];
      const haveAddButton = screen.getAllByText('Add Card')[0];
      
      // Try to add a non-existent card
      fireEvent.change(haveSearchInput, { target: { value: 'Non Existent Card' } });
      fireEvent.click(haveAddButton);
      
      // No cards should be added
      expect(screen.queryByText('Non Existent Card')).not.toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    test('maintains functionality on different screen sizes', () => {
      // Test with different viewport sizes
      const { rerender } = renderWithProviders(<App />);
      
      // Should work on mobile
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      window.dispatchEvent(new Event('resize'));
      
      rerender(<App />);
      expect(screen.getByText('FAB Trades')).toBeInTheDocument();
      
      // Should work on desktop
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1920,
      });
      window.dispatchEvent(new Event('resize'));
      
      rerender(<App />);
      expect(screen.getByText('FAB Trades')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    test('handles missing card data gracefully', () => {
      // Mock empty card data
      const emptyCardData = {
        cardGroups: [],
        loading: false,
        dataReady: true,
        error: null,
        usingLocalFiles: false
      };
      
      jest.doMock('./inputs/cardDataProvider', () => ({
        ...jest.requireActual('./inputs/cardDataProvider'),
        useCardData: () => emptyCardData
      }));
      
      renderWithProviders(<App />);
      
      // App should still render without crashing
      expect(screen.getByText('FAB Trades')).toBeInTheDocument();
      expect(screen.getByText('Cards I Have')).toBeInTheDocument();
      expect(screen.getByText('Cards I Want')).toBeInTheDocument();
    });
  });
});
