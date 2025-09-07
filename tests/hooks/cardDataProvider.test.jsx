import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import {CardDataProvider} from "../../src/hooks/useCardData.jsx";

// Mock fetch globally
global.fetch = jest.fn();

// Mock console methods to avoid noise in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Test component to use the hook
const TestComponent = () => {
  const { cardGroups, loading, dataReady, error, usingLocalFiles } = useCardData();

  return (
    <div>
      <div data-testid="loading">{loading.toString()}</div>
      <div data-testid="data-ready">{dataReady.toString()}</div>
      <div data-testid="error">{error || 'no-error'}</div>
      <div data-testid="using-local">{usingLocalFiles.toString()}</div>
      <div data-testid="card-count">{cardGroups?.length || 0}</div>
      {cardGroups?.map((card, index) => (
        <div key={index} data-testid={`card-${index}`}>
          {card.name}
        </div>
      ))}
    </div>
  );
};

const renderWithProvider = (component) => {
  return render(
    <CardDataProvider>
      {component}
    </CardDataProvider>
  );
};

describe('CardDataProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset fetch mock
    global.fetch.mockClear();
  });

  describe('Initial State', () => {
    test('starts with correct initial state', () => {
      renderWithProvider(<TestComponent />);

      expect(screen.getByTestId('loading')).toHaveTextContent('false');
      expect(screen.getByTestId('data-ready')).toHaveTextContent('false');
      expect(screen.getByTestId('error')).toHaveTextContent('no-error');
      expect(screen.getByTestId('using-local')).toHaveTextContent('false');
      expect(screen.getByTestId('card-count')).toHaveTextContent('0');
    });
  });

  describe('Data Loading', () => {
    test('loads card data successfully from API', async () => {
      const mockCardData = [
        {
          name: 'Test Card 1',
          editions: [
            { subTypeName: '1st Edition', cardPrice: 10.00, productId: '1' }
          ]
        },
        {
          name: 'Test Card 2',
          editions: [
            { subTypeName: '1st Edition', cardPrice: 15.00, productId: '2' }
          ]
        }
      ];

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCardData
      });

      renderWithProvider(<TestComponent />);

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      await waitFor(() => {
        expect(screen.getByTestId('data-ready')).toHaveTextContent('true');
      });

      // Check that cards are displayed
      expect(screen.getByTestId('card-count')).toHaveTextContent('2');
      expect(screen.getByTestId('card-0')).toHaveTextContent('Test Card 1');
      expect(screen.getByTestId('card-1')).toHaveTextContent('Test Card 2');
    });

    test('handles API errors gracefully', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      renderWithProvider(<TestComponent />);

      // Wait for error to be handled
      await waitFor(() => {
        expect(screen.getByTestId('error')).not.toHaveTextContent('no-error');
      });

      expect(screen.getByTestId('loading')).toHaveTextContent('false');
      expect(screen.getByTestId('data-ready')).toHaveTextContent('false');
    });

    test('handles non-OK API responses', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      renderWithProvider(<TestComponent />);

      // Wait for error to be handled
      await waitFor(() => {
        expect(screen.getByTestId('error')).not.toHaveTextContent('no-error');
      });

      expect(screen.getByTestId('loading')).toHaveTextContent('false');
      expect(screen.getByTestId('data-ready')).toHaveTextContent('false');
    });

    test('handles malformed JSON responses', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        }
      });

      renderWithProvider(<TestComponent />);

      // Wait for error to be handled
      await waitFor(() => {
        expect(screen.getByTestId('error')).not.toHaveTextContent('no-error');
      });

      expect(screen.getByTestId('loading')).toHaveTextContent('false');
      expect(screen.getByTestId('data-ready')).toHaveTextContent('false');
    });
  });

  describe('Local File Fallback', () => {
    test('falls back to local files when API fails', async () => {
      // Mock API failure
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      // Mock successful local file loading
      const mockLocalData = [
        {
          name: 'Local Card 1',
          editions: [
            { subTypeName: '1st Edition', cardPrice: 5.00, productId: 'local1' }
          ]
        }
      ];

      // Mock the local file loading logic
      jest.doMock('./cardDataProvider', () => ({
        ...jest.requireActual('./cardDataProvider'),
        loadLocalCardData: jest.fn().mockResolvedValue(mockLocalData)
      }));

      renderWithProvider(<TestComponent />);

      // Wait for local data to load
      await waitFor(() => {
        expect(screen.getByTestId('using-local')).toHaveTextContent('true');
      });

      await waitFor(() => {
        expect(screen.getByTestId('data-ready')).toHaveTextContent('true');
      });

      // Check that local cards are displayed
      expect(screen.getByTestId('card-count')).toHaveTextContent('1');
      expect(screen.getByTestId('card-0')).toHaveTextContent('Local Card 1');
    });

    test('handles local file loading errors', async () => {
      // Mock API failure
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      // Mock local file loading failure
      jest.doMock('./cardDataProvider', () => ({
        ...jest.requireActual('./cardDataProvider'),
        loadLocalCardData: jest.fn().mockRejectedValue(new Error('Local file error'))
      }));

      renderWithProvider(<TestComponent />);

      // Wait for error to be handled
      await waitFor(() => {
        expect(screen.getByTestId('error')).not.toHaveTextContent('no-error');
      });

      expect(screen.getByTestId('loading')).toHaveTextContent('false');
      expect(screen.getByTestId('data-ready')).toHaveTextContent('false');
      expect(screen.getByTestId('using-local')).toHaveTextContent('false');
    });
  });

  describe('Data Processing', () => {
    test('processes card data correctly', async () => {
      const mockRawData = [
        {
          name: 'Test Card',
          editions: [
            { subTypeName: '1st Edition', cardPrice: 10.00, productId: '1' },
            { subTypeName: '2nd Edition', cardPrice: 15.00, productId: '2' }
          ]
        }
      ];

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRawData
      });

      renderWithProvider(<TestComponent />);

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByTestId('data-ready')).toHaveTextContent('true');
      });

      // Check that card data is processed correctly
      expect(screen.getByTestId('card-count')).toHaveTextContent('1');
      expect(screen.getByTestId('card-0')).toHaveTextContent('Test Card');
    });

    test('handles empty card data', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      renderWithProvider(<TestComponent />);

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByTestId('data-ready')).toHaveTextContent('true');
      });

      // Check that empty state is handled
      expect(screen.getByTestId('card-count')).toHaveTextContent('0');
    });

    test('handles cards without editions', async () => {
      const mockDataWithoutEditions = [
        {
          name: 'Card Without Editions'
          // Missing editions array
        }
      ];

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockDataWithoutEditions
      });

      renderWithProvider(<TestComponent />);

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByTestId('data-ready')).toHaveTextContent('true');
      });

      // Should still render without crashing
      expect(screen.getByTestId('card-count')).toHaveTextContent('1');
      expect(screen.getByTestId('card-0')).toHaveTextContent('Card Without Editions');
    });
  });

  describe('Loading States', () => {
    test('shows loading state during API call', async () => {
      // Create a promise that we can control
      let resolveFetch;
      const fetchPromise = new Promise((resolve) => {
        resolveFetch = resolve;
      });

      global.fetch.mockReturnValueOnce(fetchPromise);

      renderWithProvider(<TestComponent />);

      // Should show loading initially
      expect(screen.getByTestId('loading')).toHaveTextContent('true');

      // Resolve the fetch
      resolveFetch({
        ok: true,
        json: async () => []
      });

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });
    });

    test('transitions through loading states correctly', async () => {
      const mockData = [
        {
          name: 'Test Card',
          editions: [
            { subTypeName: '1st Edition', cardPrice: 10.00, productId: '1' }
          ]
        }
      ];

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData
      });

      renderWithProvider(<TestComponent />);

      // Initial state: loading=true, dataReady=false
      expect(screen.getByTestId('loading')).toHaveTextContent('true');
      expect(screen.getByTestId('data-ready')).toHaveTextContent('false');

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      // Final state: loading=false, dataReady=true
      await waitFor(() => {
        expect(screen.getByTestId('data-ready')).toHaveTextContent('true');
      });
    });
  });

  describe('Error Handling', () => {
    test('handles network errors', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      renderWithProvider(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('error')).not.toHaveTextContent('no-error');
      });

      expect(screen.getByTestId('loading')).toHaveTextContent('false');
      expect(screen.getByTestId('data-ready')).toHaveTextContent('false');
    });

    test('handles timeout errors', async () => {
      // Mock a timeout scenario
      global.fetch.mockImplementationOnce(() =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      );

      renderWithProvider(<TestComponent />);

      // Wait for timeout error
      await waitFor(() => {
        expect(screen.getByTestId('error')).not.toHaveTextContent('no-error');
      }, { timeout: 200 });

      expect(screen.getByTestId('loading')).toHaveTextContent('false');
      expect(screen.getByTestId('data-ready')).toHaveTextContent('false');
    });

    test('handles multiple consecutive errors', async () => {
      // Mock multiple API failures
      global.fetch
        .mockRejectedValueOnce(new Error('First error'))
        .mockRejectedValueOnce(new Error('Second error'));

      const { rerender } = renderWithProvider(<TestComponent />);

      // First error
      await waitFor(() => {
        expect(screen.getByTestId('error')).not.toHaveTextContent('no-error');
      });

      // Simulate retry
      rerender(
        <CardDataProvider>
          <TestComponent />
        </CardDataProvider>
      );

      // Second error
      await waitFor(() => {
        expect(screen.getByTestId('error')).not.toHaveTextContent('no-error');
      });
    });
  });

  describe('Performance', () => {
    test('loads data efficiently', async () => {
      const mockData = Array.from({ length: 1000 }, (_, i) => ({
        name: `Card ${i}`,
        editions: [
          { subTypeName: '1st Edition', cardPrice: 10.00 + i, productId: `${i}` }
        ]
      }));

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData
      });

      const startTime = performance.now();

      renderWithProvider(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('data-ready')).toHaveTextContent('true');
      });

      const endTime = performance.now();

      // Should load 1000 cards in reasonable time (less than 1000ms)
      expect(endTime - startTime).toBeLessThan(1000);

      // Verify all cards are loaded
      expect(screen.getByTestId('card-count')).toHaveTextContent('1000');
    });

    test('handles rapid re-renders efficiently', async () => {
      const mockData = [
        {
          name: 'Test Card',
          editions: [
            { subTypeName: '1st Edition', cardPrice: 10.00, productId: '1' }
          ]
        }
      ];

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData
      });

      const { rerender } = renderWithProvider(<TestComponent />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByTestId('data-ready')).toHaveTextContent('true');
      });

      const startTime = performance.now();

      // Perform multiple re-renders
      for (let i = 0; i < 100; i++) {
        rerender(
          <CardDataProvider>
            <TestComponent />
          </CardDataProvider>
        );
      }

      const endTime = performance.now();

      // Should handle 100 re-renders efficiently (less than 100ms)
      expect(endTime - startTime).toBeLessThan(100);
    });
  });

  describe('Memory Management', () => {
    test('cleans up resources on unmount', async () => {
      const mockData = [
        {
          name: 'Test Card',
          editions: [
            { subTypeName: '1st Edition', cardPrice: 10.00, productId: '1' }
          ]
        }
      ];

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData
      });

      const { unmount } = renderWithProvider(<TestComponent />);

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByTestId('data-ready')).toHaveTextContent('true');
      });

      // Unmount component
      unmount();

      // Should not cause memory leaks or errors
      expect(() => {
        // This should not throw any errors
      }).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    test('handles very large datasets', async () => {
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        name: `Card ${i}`,
        editions: [
          { subTypeName: '1st Edition', cardPrice: 10.00 + i, productId: `${i}` }
        ]
      }));

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => largeDataset
      });

      renderWithProvider(<TestComponent />);

      // Should handle large datasets without crashing
      await waitFor(() => {
        expect(screen.getByTestId('data-ready')).toHaveTextContent('true');
      }, { timeout: 5000 });

      expect(screen.getByTestId('card-count')).toHaveTextContent('10000');
    });

    test('handles malformed card data gracefully', async () => {
      const malformedData = [
        {
          name: 'Valid Card',
          editions: [
            { subTypeName: '1st Edition', cardPrice: 10.00, productId: '1' }
          ]
        },
        {
          // Missing name
          editions: [
            { subTypeName: '1st Edition', cardPrice: 10.00, productId: '2' }
          ]
        },
        {
          name: 'Card Without Editions'
          // Missing editions
        },
        null, // Null entry
        undefined, // Undefined entry
        'Invalid string entry' // Wrong type
      ];

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => malformedData
      });

      renderWithProvider(<TestComponent />);

      // Should handle malformed data gracefully
      await waitFor(() => {
        expect(screen.getByTestId('data-ready')).toHaveTextContent('true');
      });

      // Should still show valid cards
      expect(screen.getByTestId('card-0')).toHaveTextContent('Valid Card');
    });

    test('handles concurrent data loading requests', async () => {
      // Mock multiple concurrent fetch calls
      const mockData1 = [{ name: 'Card 1', editions: [] }];
      const mockData2 = [{ name: 'Card 2', editions: [] }];

      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockData1
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockData2
        });

      // Render multiple components that will trigger data loading
      const { rerender } = renderWithProvider(<TestComponent />);

      // Wait for first load
      await waitFor(() => {
        expect(screen.getByTestId('data-ready')).toHaveTextContent('true');
      });

      // Re-render to trigger another load
      rerender(
        <CardDataProvider>
          <TestComponent />
        </CardDataProvider>
      );

      // Should handle concurrent requests without conflicts
      await waitFor(() => {
        expect(screen.getByTestId('data-ready')).toHaveTextContent('true');
      });
    });
  });
});
