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

  test('handleInputChange forwards the value and opens the dropdown', () => {
    const onInputChange = jest.fn();
    const { result } = renderHook(() => useSearch({ items, onInputChange }));

    act(() =>
      result.current.handleInputChange({ target: { value: 'light' } })
    );

    expect(onInputChange).toHaveBeenCalledWith(expect.anything(), 'light');
    expect(result.current.isOpen).toBe(true);
  });

  test('keepOpenOnSelect leaves the dropdown open after selecting', () => {
    const { result } = renderHook(() =>
      useSearch({ items, keepOpenOnSelect: true })
    );
    act(() => result.current.handleSelect(items[0]));
    expect(result.current.isOpen).toBe(true);
  });

  test('ArrowUp moves the highlight back up, bounded at -1', async () => {
    const { result } = renderHook(() =>
      useSearch({ items, inputValue: 'lightning' })
    );
    await waitFor(() => expect(result.current.filteredItems.length).toBe(2));

    const preventDefault = jest.fn();
    act(() => result.current.handleKeyDown({ key: 'ArrowDown', preventDefault }));
    act(() => result.current.handleKeyDown({ key: 'ArrowDown', preventDefault }));
    expect(result.current.highlightedIndex).toBe(1);

    act(() => result.current.handleKeyDown({ key: 'ArrowUp', preventDefault }));
    expect(result.current.highlightedIndex).toBe(0);

    act(() => result.current.handleKeyDown({ key: 'ArrowUp', preventDefault }));
    act(() => result.current.handleKeyDown({ key: 'ArrowUp', preventDefault }));
    expect(result.current.highlightedIndex).toBe(-1);
  });

  test('Enter selects the currently highlighted item', async () => {
    const onSelect = jest.fn();
    const { result } = renderHook(() =>
      useSearch({ items, onSelect, inputValue: 'lightning' })
    );
    await waitFor(() => expect(result.current.filteredItems.length).toBe(2));

    act(() =>
      result.current.handleKeyDown({ key: 'ArrowDown', preventDefault: jest.fn() })
    );
    act(() =>
      result.current.handleKeyDown({ key: 'Enter', preventDefault: jest.fn() })
    );

    expect(onSelect).toHaveBeenCalledWith(result.current.filteredItems[0]);
  });

  test('Tab closes the dropdown', () => {
    const { result } = renderHook(() => useSearch({ items }));
    act(() => result.current.handleFocus());
    act(() => result.current.handleKeyDown({ key: 'Tab' }));
    expect(result.current.isOpen).toBe(false);
  });

  test('a printable key opens the dropdown', () => {
    const { result } = renderHook(() => useSearch({ items }));
    act(() => result.current.handleKeyDown({ key: 'a' }));
    expect(result.current.isOpen).toBe(true);
  });

  test('handleKeyDown is a no-op when disabled', () => {
    const { result } = renderHook(() => useSearch({ items, disabled: true }));
    const preventDefault = jest.fn();
    act(() => result.current.handleKeyDown({ key: 'ArrowDown', preventDefault }));
    expect(preventDefault).not.toHaveBeenCalled();
    expect(result.current.isOpen).toBe(false);
  });

  test('handleClear clears the input, refocuses and reopens', () => {
    const onInputChange = jest.fn();
    const { result } = renderHook(() => useSearch({ items, onInputChange }));
    const stopPropagation = jest.fn();

    act(() => result.current.handleClear({ stopPropagation }));

    expect(stopPropagation).toHaveBeenCalled();
    expect(onInputChange).toHaveBeenCalledWith(null, '');
    expect(result.current.isOpen).toBe(true);
  });
});
