import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CardPanel from '../../src/components/ui/CardPanel.jsx';

const theme = createTheme();

const defaultProps = {
  title: 'Test Panel',
  cards: [],
  cardOptions: ['Test Card 1', 'Test Card 2', 'Test Card 3'],
  inputValue: '',
  onInputChange: jest.fn(),
  onAddCard: jest.fn(),
  onRemoveCard: jest.fn(),
  onUpdateEdition: jest.fn(),
  onUpdateQuantity: jest.fn(),
  isMobile: false,
  buttonColor: '#1976d2',
  totalColor: 'primary',
  disabled: false
};

const renderWithTheme = (component) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('CardPanel Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Rendering', () => {
    test('renders panel title correctly', () => {
      renderWithTheme(<CardPanel {...defaultProps} />);
      expect(screen.getByText('Test Panel')).toBeInTheDocument();
    });

    test('renders search input field', () => {
      renderWithTheme(<CardPanel {...defaultProps} />);
      expect(screen.getByLabelText('Search Cards')).toBeInTheDocument();
    });

    test('renders Add Card button', () => {
      renderWithTheme(<CardPanel {...defaultProps} />);
      expect(screen.getByText('Add Card')).toBeInTheDocument();
    });

    test('shows correct total when no cards', () => {
      renderWithTheme(<CardPanel {...defaultProps} />);
      expect(screen.getByText('Total: $0.00')).toBeInTheDocument();
    });

    test('shows correct total with cards', () => {
      const propsWithCards = {
        ...defaultProps,
        cards: [
          { name: 'Test Card 1', price: 10.00, quantity: 2 },
          { name: 'Test Card 2', price: 15.00, quantity: 1 }
        ]
      };
      
      renderWithTheme(<CardPanel {...propsWithCards} />);
      // Total should be (2 × $10.00) + (1 × $15.00) = $35.00
      expect(screen.getByText('Total: $35.00')).toBeInTheDocument();
    });
  });

  describe('Search Input Functionality', () => {
    test('calls onInputChange when typing', () => {
      renderWithTheme(<CardPanel {...defaultProps} />);
      
      const searchInput = screen.getByLabelText('Search Cards');
      fireEvent.change(searchInput, { target: { value: 'Test Card 1' } });
      
      expect(defaultProps.onInputChange).toHaveBeenCalled();
    });

    test('displays current input value', () => {
      const propsWithValue = {
        ...defaultProps,
        inputValue: 'Test Card 1'
      };
      
      renderWithTheme(<CardPanel {...propsWithValue} />);
      
      const searchInput = screen.getByLabelText('Search Cards');
      expect(searchInput.value).toBe('Test Card 1');
    });

    test('autocomplete shows card options', async () => {
      renderWithTheme(<CardPanel {...defaultProps} />);
      
      const searchInput = screen.getByLabelText('Search Cards');
      fireEvent.focus(searchInput);
      
      // Wait for autocomplete to show options
      await waitFor(() => {
        expect(screen.getByText('Test Card 1')).toBeInTheDocument();
        expect(screen.getByText('Test Card 2')).toBeInTheDocument();
        expect(screen.getByText('Test Card 3')).toBeInTheDocument();
      });
    });

    test('filters card options based on input', async () => {
      renderWithTheme(<CardPanel {...defaultProps} />);
      
      const searchInput = screen.getByLabelText('Search Cards');
      fireEvent.change(searchInput, { target: { value: 'Test Card 1' } });
      fireEvent.focus(searchInput);
      
      // Should only show matching cards
      await waitFor(() => {
        expect(screen.getByText('Test Card 1')).toBeInTheDocument();
        expect(screen.queryByText('Test Card 2')).not.toBeInTheDocument();
        expect(screen.queryByText('Test Card 3')).not.toBeInTheDocument();
      });
    });
  });

  describe('Add Card Button', () => {
    test('calls onAddCard when clicked', () => {
      renderWithTheme(<CardPanel {...defaultProps} />);
      
      const addButton = screen.getByText('Add Card');
      fireEvent.click(addButton);
      
      expect(defaultProps.onAddCard).toHaveBeenCalled();
    });

    test('button is disabled when panel is disabled', () => {
      const disabledProps = {
        ...defaultProps,
        disabled: true
      };
      
      renderWithTheme(<CardPanel {...disabledProps} />);
      
      const addButton = screen.getByText('Add Card');
      expect(addButton).toBeDisabled();
    });

    test('button has correct color', () => {
      renderWithTheme(<CardPanel {...defaultProps} />);
      
      const addButton = screen.getByText('Add Card');
      expect(addButton).toHaveStyle({ backgroundColor: '#1976d2' });
    });
  });

  describe('Card List Rendering', () => {
    test('renders empty state when no cards', () => {
      renderWithTheme(<CardPanel {...defaultProps} />);
      
      // Should not show any card items
      expect(screen.queryByTestId('card-item')).not.toBeInTheDocument();
    });

    test('renders cards when present', () => {
      const propsWithCards = {
        ...defaultProps,
        cards: [
          { 
            name: 'Test Card 1', 
            price: 10.00, 
            quantity: 1,
            selectedEdition: '1st Edition'
          }
        ]
      };
      
      renderWithTheme(<CardPanel {...propsWithCards} />);
      
      expect(screen.getByText('Test Card 1')).toBeInTheDocument();
      expect(screen.getByText('$10.00')).toBeInTheDocument();
      expect(screen.getByText('1st Edition')).toBeInTheDocument();
    });

    test('renders multiple cards correctly', () => {
      const propsWithCards = {
        ...defaultProps,
        cards: [
          { name: 'Test Card 1', price: 10.00, quantity: 1, selectedEdition: '1st Edition' },
          { name: 'Test Card 2', price: 15.00, quantity: 2, selectedEdition: '2nd Edition' }
        ]
      };
      
      renderWithTheme(<CardPanel {...propsWithCards} />);
      
      expect(screen.getByText('Test Card 1')).toBeInTheDocument();
      expect(screen.getByText('Test Card 2')).toBeInTheDocument();
      expect(screen.getByText('$10.00')).toBeInTheDocument();
      expect(screen.getByText('$15.00')).toBeInTheDocument();
    });
  });

  describe('Card Interactions', () => {
    test('clicking card opens edition picker', async () => {
      const propsWithCards = {
        ...defaultProps,
        cards: [
          { 
            name: 'Test Card 1', 
            price: 10.00, 
            quantity: 1,
            selectedEdition: '1st Edition',
            availableEditions: [
              { subTypeName: '1st Edition', productId: '1' },
              { subTypeName: '2nd Edition', productId: '2' }
            ]
          }
        ]
      };
      
      renderWithTheme(<CardPanel {...propsWithCards} />);
      
      const cardItem = screen.getByText('Test Card 1').closest('li');
      fireEvent.click(cardItem);
      
      // Edition picker should open
      await waitFor(() => {
        expect(screen.getByText('Select Edition')).toBeInTheDocument();
      });
    });

    test('quantity dropdown works correctly', async () => {
      const propsWithCards = {
        ...defaultProps,
        cards: [
          { 
            name: 'Test Card 1', 
            price: 10.00, 
            quantity: 1,
            selectedEdition: '1st Edition'
          }
        ]
      };
      
      renderWithTheme(<CardPanel {...propsWithCards} />);
      
      // Find quantity dropdown
      const quantityDropdown = screen.getByDisplayValue('1');
      fireEvent.mouseDown(quantityDropdown);
      
      // Select quantity 3
      const option3 = screen.getByText('3');
      fireEvent.click(option3);
      
      // Should call onUpdateQuantity
      expect(defaultProps.onUpdateQuantity).toHaveBeenCalledWith(0, 3);
    });

    test('delete button removes card', async () => {
      const propsWithCards = {
        ...defaultProps,
        cards: [
          { 
            name: 'Test Card 1', 
            price: 10.00, 
            quantity: 1,
            selectedEdition: '1st Edition'
          }
        ]
      };
      
      renderWithTheme(<CardPanel {...propsWithCards} />);
      
      // Find and click delete button
      const deleteButton = screen.getByRole('button', { name: /delete/i });
      fireEvent.click(deleteButton);
      
      // Should call onRemoveCard
      expect(defaultProps.onRemoveCard).toHaveBeenCalledWith(0);
    });
  });

  describe('Responsive Behavior', () => {
    test('adapts to mobile layout', () => {
      const mobileProps = {
        ...defaultProps,
        isMobile: true
      };
      
      renderWithTheme(<CardPanel {...mobileProps} />);
      
      // Panel should render without errors on mobile
      expect(screen.getByText('Test Panel')).toBeInTheDocument();
      expect(screen.getByLabelText('Search Cards')).toBeInTheDocument();
    });

    test('adapts to desktop layout', () => {
      const desktopProps = {
        ...defaultProps,
        isMobile: false
      };
      
      renderWithTheme(<CardPanel {...desktopProps} />);
      
      // Panel should render without errors on desktop
      expect(screen.getByText('Test Panel')).toBeInTheDocument();
      expect(screen.getByLabelText('Search Cards')).toBeInTheDocument();
    });
  });

  describe('Disabled State', () => {
    test('search input is disabled when panel is disabled', () => {
      const disabledProps = {
        ...defaultProps,
        disabled: true
      };
      
      renderWithTheme(<CardPanel {...disabledProps} />);
      
      const searchInput = screen.getByLabelText('Search Cards');
      expect(searchInput).toBeDisabled();
    });

    test('add button is disabled when panel is disabled', () => {
      const disabledProps = {
        ...defaultProps,
        disabled: true
      };
      
      renderWithTheme(<CardPanel {...disabledProps} />);
      
      const addButton = screen.getByText('Add Card');
      expect(addButton).toBeDisabled();
    });

    test('cards are still visible when disabled', () => {
      const disabledPropsWithCards = {
        ...defaultProps,
        disabled: true,
        cards: [
          { name: 'Test Card 1', price: 10.00, quantity: 1, selectedEdition: '1st Edition' }
        ]
      };
      
      renderWithTheme(<CardPanel {...disabledPropsWithCards} />);
      
      // Cards should still be visible
      expect(screen.getByText('Test Card 1')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    test('handles cards with missing properties gracefully', () => {
      const propsWithIncompleteCards = {
        ...defaultProps,
        cards: [
          { name: 'Test Card 1' }, // Missing price, quantity, edition
          { name: 'Test Card 2', price: 15.00 } // Missing quantity, edition
        ]
      };
      
      renderWithTheme(<CardPanel {...propsWithIncompleteCards} />);
      
      // Should render without crashing
      expect(screen.getByText('Test Card 1')).toBeInTheDocument();
      expect(screen.getByText('Test Card 2')).toBeInTheDocument();
    });

    test('handles empty card options array', () => {
      const propsWithNoOptions = {
        ...defaultProps,
        cardOptions: []
      };
      
      renderWithTheme(<CardPanel {...propsWithNoOptions} />);
      
      // Should render without crashing
      expect(screen.getByText('Test Panel')).toBeInTheDocument();
      expect(screen.getByLabelText('Search Cards')).toBeInTheDocument();
    });

    test('handles very long card names', () => {
      const longCardName = 'This is a very long card name that might cause layout issues and should be handled gracefully by the component';
      const propsWithLongName = {
        ...defaultProps,
        cards: [
          { 
            name: longCardName, 
            price: 10.00, 
            quantity: 1,
            selectedEdition: '1st Edition'
          }
        ]
      };
      
      renderWithTheme(<CardPanel {...propsWithLongName} />);
      
      // Should render without crashing
      expect(screen.getByText(longCardName)).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    test('renders many cards efficiently', () => {
      const manyCards = Array.from({ length: 100 }, (_, i) => ({
        name: `Test Card ${i + 1}`,
        price: 10.00 + i,
        quantity: 1,
        selectedEdition: '1st Edition'
      }));
      
      const propsWithManyCards = {
        ...defaultProps,
        cards: manyCards
      };
      
      const startTime = performance.now();
      renderWithTheme(<CardPanel {...propsWithManyCards} />);
      const endTime = performance.now();
      
      // Should render 100 cards in reasonable time (less than 100ms)
      expect(endTime - startTime).toBeLessThan(100);
      
      // Should show all cards
      expect(screen.getByText('Test Card 1')).toBeInTheDocument();
      expect(screen.getByText('Test Card 100')).toBeInTheDocument();
    });
  });
});
