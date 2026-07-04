import { renderHook, act, waitFor } from '@testing-library/react';
import { useSearch } from '../../src/hooks/useSearch.js';

const items = [
  { label: 'Lightning Press', card: {} },
  { label: 'Lightning Strike', card: {} },
  { label: 'Snapdragon Scalers', card: {} },
];

describe('useSearch', () => {
  test('starts closed with no highlighted item', () => {
    const { result } = renderHook(() => useSearch({ items }));
    expect(result.current.isOpen).toBe(false);
    expect(result.current.highlightedIndex).toBe(-1);
  });

  test('populates filtered items (debounced) based on the input value', async () => {
    const { result } = renderHook(() =>
      useSearch({ items, inputValue: 'lightning' })
    );
    await waitFor(() => {
      expect(result.current.filteredItems.length).toBe(2);
    });
    expect(result.current.filteredItems.map((i) => i.label)).toContain(
      'Lightning Press'
    );
  });

  test('handleFocus opens the dropdown', () => {
    const { result } = renderHook(() => useSearch({ items }));
    act(() => result.current.handleFocus());
    expect(result.current.isOpen).toBe(true);
  });

  test('does not open on focus when disabled', () => {
    const { result } = renderHook(() => useSearch({ items, disabled: true }));
    act(() => result.current.handleFocus());
    expect(result.current.isOpen).toBe(false);
  });

  test('handleSelect fires onSelect and clears the input via onInputChange', () => {
    const onSelect = jest.fn();
    const onInputChange = jest.fn();
    const { result } = renderHook(() =>
      useSearch({ items, onSelect, onInputChange })
    );
    act(() => result.current.handleSelect(items[0]));

    expect(onSelect).toHaveBeenCalledWith(items[0]);
    expect(onInputChange).toHaveBeenCalledWith(null, '');
    expect(result.current.isOpen).toBe(false);
  });

  test('keepInputOnSelect prevents the input from being cleared', () => {
    const onInputChange = jest.fn();
    const { result } = renderHook(() =>
      useSearch({ items, onInputChange, keepInputOnSelect: true })
    );
    act(() => result.current.handleSelect(items[0]));
    expect(onInputChange).not.toHaveBeenCalled();
  });

  test('ArrowDown moves the highlight down and opens the dropdown', async () => {
    const { result } = renderHook(() =>
      useSearch({ items, inputValue: 'lightning' })
    );
    await waitFor(() => expect(result.current.filteredItems.length).toBe(2));

    const preventDefault = jest.fn();
    act(() => result.current.handleKeyDown({ key: 'ArrowDown', preventDefault }));

    expect(preventDefault).toHaveBeenCalled();
    expect(result.current.isOpen).toBe(true);
    expect(result.current.highlightedIndex).toBe(0);
  });

  test('Escape closes the dropdown and clears the highlight', () => {
    const { result } = renderHook(() => useSearch({ items }));
    act(() => result.current.handleFocus());

    const preventDefault = jest.fn();
    act(() => result.current.handleKeyDown({ key: 'Escape', preventDefault }));

    expect(result.current.isOpen).toBe(false);
    expect(result.current.highlightedIndex).toBe(-1);
  });

  test('Enter selects the single remaining result', async () => {
    const onSelect = jest.fn();
    const { result } = renderHook(() =>
      useSearch({ items, onSelect, inputValue: 'snapdragon' })
    );
    await waitFor(() => expect(result.current.filteredItems.length).toBe(1));

    act(() =>
      result.current.handleKeyDown({ key: 'Enter', preventDefault: jest.fn() })
    );
    expect(onSelect).toHaveBeenCalledWith(items[2]);
  });
});
