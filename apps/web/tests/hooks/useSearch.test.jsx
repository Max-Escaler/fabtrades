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

  test('Enter selects the currently highlighted result', async () => {
    const onSelect = jest.fn();
    const { result } = renderHook(() =>
      useSearch({ items, onSelect, inputValue: 'lightning' })
    );
    await waitFor(() => expect(result.current.filteredItems.length).toBe(2));

    act(() =>
      result.current.handleKeyDown({ key: 'ArrowDown', preventDefault: jest.fn() })
    );
    act(() =>
      result.current.handleKeyDown({ key: 'ArrowDown', preventDefault: jest.fn() })
    );
    expect(result.current.highlightedIndex).toBe(1);

    act(() =>
      result.current.handleKeyDown({ key: 'Enter', preventDefault: jest.fn() })
    );
    expect(onSelect).toHaveBeenCalledWith(result.current.filteredItems[1]);
  });

  test('ArrowUp moves the highlight back toward -1 without going past it', async () => {
    const { result } = renderHook(() =>
      useSearch({ items, inputValue: 'lightning' })
    );
    await waitFor(() => expect(result.current.filteredItems.length).toBe(2));

    act(() =>
      result.current.handleKeyDown({ key: 'ArrowDown', preventDefault: jest.fn() })
    );
    expect(result.current.highlightedIndex).toBe(0);

    act(() =>
      result.current.handleKeyDown({ key: 'ArrowUp', preventDefault: jest.fn() })
    );
    expect(result.current.highlightedIndex).toBe(-1);

    // Already at the top; another ArrowUp should stay at -1.
    act(() =>
      result.current.handleKeyDown({ key: 'ArrowUp', preventDefault: jest.fn() })
    );
    expect(result.current.highlightedIndex).toBe(-1);
  });

  test('Tab closes the dropdown', () => {
    const { result } = renderHook(() => useSearch({ items }));
    act(() => result.current.handleFocus());
    expect(result.current.isOpen).toBe(true);

    act(() => result.current.handleKeyDown({ key: 'Tab' }));
    expect(result.current.isOpen).toBe(false);
  });

  test('a printable key opens the dropdown by default', () => {
    const { result } = renderHook(() => useSearch({ items }));
    expect(result.current.isOpen).toBe(false);

    act(() => result.current.handleKeyDown({ key: 'a' }));
    expect(result.current.isOpen).toBe(true);
  });

  test('keyboard navigation is ignored when disabled', () => {
    const { result } = renderHook(() => useSearch({ items, disabled: true }));
    act(() => result.current.handleKeyDown({ key: 'a' }));
    expect(result.current.isOpen).toBe(false);
  });

  test('handleInputChange opens the dropdown for a non-empty value', () => {
    const onInputChange = jest.fn();
    const { result } = renderHook(() => useSearch({ items, onInputChange }));

    act(() => result.current.handleInputChange({ target: { value: 'li' } }));
    expect(onInputChange).toHaveBeenCalledWith(
      expect.objectContaining({ target: { value: 'li' } }),
      'li'
    );
    expect(result.current.isOpen).toBe(true);
  });

  test('handleInputChange leaves the dropdown closed for an empty value', () => {
    const onInputChange = jest.fn();
    const { result } = renderHook(() => useSearch({ items, onInputChange }));

    act(() => result.current.handleInputChange({ target: { value: '' } }));
    expect(onInputChange).toHaveBeenCalledWith(expect.anything(), '');
    expect(result.current.isOpen).toBe(false);
  });

  test('keepOpenOnSelect keeps the dropdown open after selecting', () => {
    const { result } = renderHook(() =>
      useSearch({ items, keepOpenOnSelect: true })
    );
    act(() => result.current.handleSelect(items[0]));
    expect(result.current.isOpen).toBe(true);
  });

  test('handleClear resets the input via the callback and re-opens', () => {
    const onInputChange = jest.fn();
    const { result } = renderHook(() => useSearch({ items, onInputChange }));

    const stopPropagation = jest.fn();
    act(() => result.current.handleClear({ stopPropagation }));

    expect(stopPropagation).toHaveBeenCalled();
    expect(onInputChange).toHaveBeenCalledWith(null, '');
    expect(result.current.isOpen).toBe(true);
  });

  test('handleBlur closes the dropdown once focus leaves the dropdown', async () => {
    const { result } = renderHook(() => useSearch({ items }));
    act(() => {
      result.current.handleFocus();
      // A detached node stands in for the rendered dropdown; document.body
      // (the active element) is not inside it, so blur should close.
      result.current.dropdownRef.current = document.createElement('div');
    });
    expect(result.current.isOpen).toBe(true);

    act(() => result.current.handleBlur());
    await waitFor(() => expect(result.current.isOpen).toBe(false));
  });

  test('a mousedown outside the input and dropdown closes it', () => {
    const { result } = renderHook(() => useSearch({ items }));
    act(() => {
      result.current.inputRef.current = document.createElement('input');
      result.current.dropdownRef.current = document.createElement('div');
      result.current.handleFocus();
    });
    expect(result.current.isOpen).toBe(true);

    act(() => {
      document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });
    expect(result.current.isOpen).toBe(false);
  });

  test('debounced filtering cancels the pending timer across rapid input changes', async () => {
    const { result, rerender } = renderHook(
      ({ inputValue }) => useSearch({ items, inputValue }),
      { initialProps: { inputValue: 'l' } }
    );
    rerender({ inputValue: 'li' });
    rerender({ inputValue: 'lightning' });

    await waitFor(() => expect(result.current.filteredItems.length).toBe(2));
  });
});
