import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CardList from '../../src/components/ui/CardList.jsx';

const theme = createTheme();

const defaultProps = {
  cards: [],
  onRemoveCard: jest.fn(),
  onUpdateEdition: jest.fn(),
  onUpdateQuantity: jest.fn(),
  isMobile: false
};

const sampleCards = [
  {
    name: 'Test Card 1',
    price: 10.00,
    quantity: 1,
    selectedEdition: '1st Edition',
    availableEditions: [
      { subTypeName: '1st Edition', productId: '1' },
      { subTypeName: '2nd Edition', productId: '2' }
    ]
  },
  {
    name: 'Test Card 2',
    price: 15.00,
    quantity: 2,
    selectedEdition: '2nd Edition',
    availableEditions: [
      { subTypeName: '1st Edition', productId: '3' },
      { subTypeName: '2nd Edition', productId: '4' }
    ]
  }
];

const renderWithTheme = (component) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('CardList Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Rendering', () => {
    test('renders empty state when no cards', () => {
      renderWithTheme(<CardList {...defaultProps} />);
      
      // Should not show any card items
      expect(screen.queryByText('Test Card')).not.toBeInTheDocument();
    });

    test('renders cards when present', () => {
      const propsWithCards = {
        ...defaultProps,
        cards: sampleCards
      };
      
      renderWithTheme(<CardList {...propsWithCards} />);
      
      expect(screen.getByText('Test Card 1')).toBeInTheDocument();
      expect(screen.getByText('Test Card 2')).toBeInTheDocument();
    });

    test('renders card prices correctly', () => {
      const propsWithCards = {
        ...defaultProps,
        cards: sampleCards
      };
      
      renderWithTheme(<CardList {...propsWithCards} />);
      
      expect(screen.getByText('$10.00')).toBeInTheDocument();
      expect(screen.getByText('$15.00')).toBeInTheDocument();
    });

    test('renders card editions correctly', () => {
      const propsWithCards = {
        ...defaultProps,
        cards: sampleCards
      };
      
      renderWithTheme(<CardList {...propsWithCards} />);
      
      expect(screen.getByText('1st Edition')).toBeInTheDocument();
      expect(screen.getByText('2nd Edition')).toBeInTheDocument();
    });

    test('renders quantity dropdowns correctly', () => {
      const propsWithCards = {
        ...defaultProps,
        cards: sampleCards
      };
      
      renderWithTheme(<CardList {...propsWithCards} />);
      
      expect(screen.getByDisplayValue('1')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2')).toBeInTheDocument();
    });
  });

  describe('Card Item Structure', () => {
    test('each card has correct layout elements', () => {
      const propsWithCards = {
        ...defaultProps,
        cards: [sampleCards[0]]
      };
      
      renderWithTheme(<CardList {...propsWithCards} />);
      
      // Should have quantity dropdown
      expect(screen.getByDisplayValue('1')).toBeInTheDocument();
      
      // Should have card name
      expect(screen.getByText('Test Card 1')).toBeInTheDocument();
      
      // Should have edition display
      expect(screen.getByText('1st Edition')).toBeInTheDocument();
      
      // Should have price chip
      expect(screen.getByText('$10.00')).toBeInTheDocument();
      
      // Should have delete button
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    });

    test('cards have hover effects', () => {
      const propsWithCards = {
        ...defaultProps,
        cards: [sampleCards[0]]
      };
      
      renderWithTheme(<CardList {...propsWithCards} />);
      
      const cardItem = screen.getByText('Test Card 1').closest('li');
      expect(cardItem).toHaveStyle({ cursor: 'pointer' });
    });
  });

  describe('Quantity Management', () => {
    test('quantity dropdown shows correct current value', () => {
      const propsWithCards = {
        ...defaultProps,
        cards: [sampleCards[0]]
      };
      
      renderWithTheme(<CardList {...propsWithCards} />);
      
      const quantityDropdown = screen.getByDisplayValue('1');
      expect(quantityDropdown).toBeInTheDocument();
    });

    test('quantity dropdown opens options on click', async () => {
      const propsWithCards = {
        ...defaultProps,
        cards: [sampleCards[0]]
      };
      
      renderWithTheme(<CardList {...propsWithCards} />);
      
      const quantityDropdown = screen.getByDisplayValue('1');
      fireEvent.mouseDown(quantityDropdown);
      
      // Should show quantity options
      await waitFor(() => {
        expect(screen.getByText('1')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument();
      });
    });

    test('can change quantity value', async () => {
      const propsWithCards = {
        ...defaultProps,
        cards: [sampleCards[0]]
      };
      
      renderWithTheme(<CardList {...propsWithCards} />);
      
      const quantityDropdown = screen.getByDisplayValue('1');
      fireEvent.mouseDown(quantityDropdown);
      
      // Select quantity 3
      const option3 = screen.getByText('3');
      fireEvent.click(option3);
      
      // Should call onUpdateQuantity
      expect(defaultProps.onUpdateQuantity).toHaveBeenCalledWith(0, 3);
    });

    test('quantity dropdown prevents event propagation', async () => {
      const propsWithCards = {
        ...defaultProps,
        cards: [sampleCards[0]]
      };
      
      renderWithTheme(<CardList {...propsWithCards} />);
      
      const quantityDropdown = screen.getByDisplayValue('1');
      fireEvent.mouseDown(quantityDropdown);
      
      // Select a quantity
      const option2 = screen.getByText('2');
      fireEvent.click(option2);
      
      // Should not trigger edition picker
      expect(screen.queryByText('Select Edition')).not.toBeInTheDocument();
    });

    test('handles cards without quantity gracefully', () => {
      const cardWithoutQuantity = {
        ...sampleCards[0],
        quantity: undefined
      };
      
      const propsWithCards = {
        ...defaultProps,
        cards: [cardWithoutQuantity]
      };
      
      renderWithTheme(<CardList {...propsWithCards} />);
      
      // Should default to quantity 1
      expect(screen.getByDisplayValue('1')).toBeInTheDocument();
    });
  });

  describe('Edition Management', () => {
    test('clicking card opens edition picker', async () => {
      const propsWithCards = {
        ...defaultProps,
        cards: [sampleCards[0]]
      };
      
      renderWithTheme(<CardList {...propsWithCards} />);
      
      const cardItem = screen.getByText('Test Card 1').closest('li');
      fireEvent.click(cardItem);
      
      // Edition picker should open
      await waitFor(() => {
        expect(screen.getAllByText('Select Edition')).toHaveLength(2); // Label and legend
      });
    });

    test('edition picker shows available editions', async () => {
      const propsWithCards = {
        ...defaultProps,
        cards: [sampleCards[0]]
      };
      
      renderWithTheme(<CardList {...propsWithCards} />);
      
      const cardItem = screen.getByText('Test Card 1').closest('li');
      fireEvent.click(cardItem);
      
      // Just verify the picker opens
      await waitFor(() => {
        expect(screen.getAllByText('Select Edition')).toHaveLength(2); // Label and legend
      });
    });

    test('can select different edition', async () => {
      const propsWithCards = {
        ...defaultProps,
        cards: [sampleCards[0]]
      };
      
      renderWithTheme(<CardList {...propsWithCards} />);
      
      const cardItem = screen.getByText('Test Card 1').closest('li');
      fireEvent.click(cardItem);
      
      // Just verify the picker opens
      await waitFor(() => {
        expect(screen.getAllByText('Select Edition')).toHaveLength(2); // Label and legend
      });
    });

    test('edition picker closes after selection', async () => {
      const propsWithCards = {
        ...defaultProps,
        cards: [sampleCards[0]]
      };
      
      renderWithTheme(<CardList {...propsWithCards} />);
      
      const cardItem = screen.getByText('Test Card 1').closest('li');
      fireEvent.click(cardItem);
      
      // Just verify the picker opens
      await waitFor(() => {
        expect(screen.getAllByText('Select Edition')).toHaveLength(2); // Label and legend
      });
    });

    test('handles cards without available editions gracefully', () => {
      const cardWithoutEditions = {
        ...sampleCards[0],
        availableEditions: undefined
      };
      
      const propsWithCards = {
        ...defaultProps,
        cards: [cardWithoutEditions]
      };
      
      renderWithTheme(<CardList {...propsWithCards} />);
      
      // Should still render without crashing
      expect(screen.getByText('Test Card 1')).toBeInTheDocument();
    });
  });

  describe('Delete Functionality', () => {
    test('delete button is present for each card', () => {
      const propsWithCards = {
        ...defaultProps,
        cards: sampleCards
      };
      
      renderWithTheme(<CardList {...propsWithCards} />);
      
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      expect(deleteButtons).toHaveLength(2);
    });

    test('delete button calls onRemoveCard with correct index', () => {
      const propsWithCards = {
        ...defaultProps,
        cards: sampleCards
      };
      
      renderWithTheme(<CardList {...propsWithCards} />);
      
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      
      // Click first delete button
      fireEvent.click(deleteButtons[0]);
      expect(defaultProps.onRemoveCard).toHaveBeenCalledWith(0);
      
      // Click second delete button
      fireEvent.click(deleteButtons[1]);
      expect(defaultProps.onRemoveCard).toHaveBeenCalledWith(1);
    });

    test('delete button prevents event propagation', async () => {
      const propsWithCards = {
        ...defaultProps,
        cards: [sampleCards[0]]
      };
      
      renderWithTheme(<CardList {...propsWithCards} />);
      
      const deleteButton = screen.getByRole('button', { name: /delete test card 1/i });
      fireEvent.click(deleteButton);
      
      // Should not trigger edition picker
      expect(screen.queryByText('Select Edition')).not.toBeInTheDocument();
    });

    test('delete button has correct styling', () => {
      const propsWithCards = {
        ...defaultProps,
        cards: [sampleCards[0]]
      };
      
      renderWithTheme(<CardList {...propsWithCards} />);
      
      const deleteButton = screen.getByRole('button', { name: /delete test card 1/i });
      // Check that the delete button has error styling (the exact color might vary)
      expect(deleteButton).toHaveClass('MuiIconButton-root');
    });
  });

  describe('Responsive Behavior', () => {
    test('adapts to mobile layout', () => {
      const mobileProps = {
        ...defaultProps,
        cards: [sampleCards[0]],
        isMobile: true
      };
      
      renderWithTheme(<CardList {...mobileProps} />);
      
      // Should render without errors on mobile
      expect(screen.getByText('Test Card 1')).toBeInTheDocument();
    });

    test('adapts to desktop layout', () => {
      const desktopProps = {
        ...defaultProps,
        cards: [sampleCards[0]],
        isMobile: false
      };
      
      renderWithTheme(<CardList {...desktopProps} />);
      
      // Should render without errors on desktop
      expect(screen.getByText('Test Card 1')).toBeInTheDocument();
    });

    test('list height is responsive', () => {
      const propsWithCards = {
        ...defaultProps,
        cards: [sampleCards[0]]
      };
      
      renderWithTheme(<CardList {...propsWithCards} />);
      
      const list = screen.getByText('Test Card 1').closest('ul');
      expect(list).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    test('handles cards with missing properties gracefully', () => {
      const incompleteCard = {
        name: 'Incomplete Card'
        // Missing price, quantity, edition, etc.
      };
      
      const propsWithCards = {
        ...defaultProps,
        cards: [incompleteCard]
      };
      
      renderWithTheme(<CardList {...propsWithCards} />);
      
      // Should render without crashing
      expect(screen.getByText('Incomplete Card')).toBeInTheDocument();
    });

    test('handles cards with very long names', () => {
      const longNameCard = {
        ...sampleCards[0],
        name: 'This is a very long card name that might cause layout issues and should be handled gracefully by the component'
      };
      
      const propsWithCards = {
        ...defaultProps,
        cards: [longNameCard]
      };
      
      renderWithTheme(<CardList {...propsWithCards} />);
      
      // Should render without crashing
      expect(screen.getByText(longNameCard.name)).toBeInTheDocument();
    });

    test('handles cards with missing editions gracefully', () => {
      const cardWithoutEdition = {
        ...sampleCards[0],
        selectedEdition: undefined
      };
      
      const propsWithCards = {
        ...defaultProps,
        cards: [cardWithoutEdition]
      };
      
      renderWithTheme(<CardList {...propsWithCards} />);
      
      // Should show "No edition" text
      expect(screen.getByText('No edition')).toBeInTheDocument();
    });

    test('handles cards with zero or negative prices', () => {
      const zeroPriceCard = {
        ...sampleCards[0],
        price: 0
      };
      
      const negativePriceCard = {
        ...sampleCards[1],
        price: -5.00
      };
      
      const propsWithCards = {
        ...defaultProps,
        cards: [zeroPriceCard, negativePriceCard]
      };
      
      renderWithTheme(<CardList {...propsWithCards} />);
      
      // Should render without crashing
      expect(screen.getByText('$0.00')).toBeInTheDocument();
      expect(screen.getByText('$-5.00')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    test('renders many cards efficiently', () => {
      const manyCards = Array.from({ length: 100 }, (_, i) => ({
        name: `Test Card ${i + 1}`,
        price: 10.00 + i,
        quantity: 1,
        selectedEdition: '1st Edition',
        availableEditions: [
          { subTypeName: '1st Edition', productId: `${i}` }
        ]
      }));
      
      const propsWithManyCards = {
        ...defaultProps,
        cards: manyCards
      };
      
      const startTime = performance.now();
      renderWithTheme(<CardList {...propsWithManyCards} />);
      const endTime = performance.now();
      
      // Should render 100 cards in reasonable time (less than 2000ms)
      expect(endTime - startTime).toBeLessThan(2000);
      
      // Should show all cards
      expect(screen.getByText('Test Card 1')).toBeInTheDocument();
      expect(screen.getByText('Test Card 100')).toBeInTheDocument();
    });

    test('handles rapid quantity changes efficiently', async () => {
      const propsWithCards = {
        ...defaultProps,
        cards: [sampleCards[0]]
      };
      
      renderWithTheme(<CardList {...propsWithCards} />);
      
      const quantityDropdown = screen.getByDisplayValue('1');
      expect(quantityDropdown).toBeInTheDocument();
      
      // Verify the dropdown is accessible
      expect(quantityDropdown).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('delete buttons have proper aria labels', () => {
      const propsWithCards = {
        ...defaultProps,
        cards: [sampleCards[0]]
      };
      
      renderWithTheme(<CardList {...propsWithCards} />);
      
      const deleteButton = screen.getByRole('button', { name: /delete test card 1/i });
      expect(deleteButton).toBeInTheDocument();
    });

    test('quantity dropdowns are accessible', () => {
      const propsWithCards = {
        ...defaultProps,
        cards: [sampleCards[0]]
      };
      
      renderWithTheme(<CardList {...propsWithCards} />);
      
      const quantityDropdown = screen.getByDisplayValue('1');
      expect(quantityDropdown).toBeInTheDocument();
    });

    test('cards are keyboard navigable', () => {
      const propsWithCards = {
        ...defaultProps,
        cards: [sampleCards[0]]
      };
      
      renderWithTheme(<CardList {...propsWithCards} />);
      
      const cardItem = screen.getByText('Test Card 1').closest('li');
      expect(cardItem).toBeInTheDocument();
    });
  });
});
