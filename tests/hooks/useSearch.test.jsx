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

  test('handleInputChange forwards the value and opens when there is text', () => {
    const onInputChange = jest.fn();
    const { result } = renderHook(() => useSearch({ items, onInputChange }));

    act(() =>
      result.current.handleInputChange({ target: { value: 'light' } })
    );

    expect(onInputChange).toHaveBeenCalledWith(
      { target: { value: 'light' } },
      'light'
    );
    expect(result.current.isOpen).toBe(true);
  });

  test('handleInputChange keeps the dropdown closed when the value is empty', () => {
    const onInputChange = jest.fn();
    const { result } = renderHook(() => useSearch({ items, onInputChange }));

    act(() => result.current.handleInputChange({ target: { value: '' } }));

    expect(onInputChange).toHaveBeenCalledWith(
      { target: { value: '' } },
      ''
    );
    expect(result.current.isOpen).toBe(false);
  });

  test('keepOpenOnSelect keeps the dropdown open and focuses the input', () => {
    const onSelect = jest.fn();
    const { result } = renderHook(() =>
      useSearch({ items, onSelect, keepOpenOnSelect: true })
    );

    const focus = jest.fn();
    result.current.inputRef.current = { focus };

    act(() => result.current.handleSelect(items[0]));

    expect(onSelect).toHaveBeenCalledWith(items[0]);
    expect(result.current.isOpen).toBe(true);
    expect(focus).toHaveBeenCalled();
  });

  test('ArrowUp moves the highlight back up and clamps at -1', async () => {
    const { result } = renderHook(() =>
      useSearch({ items, inputValue: 'lightning' })
    );
    await waitFor(() => expect(result.current.filteredItems.length).toBe(2));

    const preventDefault = jest.fn();
    // Move down twice, then back up once.
    act(() => result.current.handleKeyDown({ key: 'ArrowDown', preventDefault }));
    act(() => result.current.handleKeyDown({ key: 'ArrowDown', preventDefault }));
    expect(result.current.highlightedIndex).toBe(1);

    act(() => result.current.handleKeyDown({ key: 'ArrowUp', preventDefault }));
    expect(result.current.highlightedIndex).toBe(0);

    // Cannot go below -1.
    act(() => result.current.handleKeyDown({ key: 'ArrowUp', preventDefault }));
    act(() => result.current.handleKeyDown({ key: 'ArrowUp', preventDefault }));
    expect(result.current.highlightedIndex).toBe(-1);
    expect(preventDefault).toHaveBeenCalled();
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
    expect(result.current.highlightedIndex).toBe(0);

    act(() =>
      result.current.handleKeyDown({ key: 'Enter', preventDefault: jest.fn() })
    );
    expect(onSelect).toHaveBeenCalledWith(result.current.filteredItems[0]);
  });

  test('Tab closes the dropdown', () => {
    const { result } = renderHook(() => useSearch({ items }));
    act(() => result.current.handleFocus());
    expect(result.current.isOpen).toBe(true);

    act(() => result.current.handleKeyDown({ key: 'Tab' }));
    expect(result.current.isOpen).toBe(false);
  });

  test('a printable key opens the dropdown when it is closed', () => {
    const { result } = renderHook(() => useSearch({ items }));
    expect(result.current.isOpen).toBe(false);

    act(() => result.current.handleKeyDown({ key: 'a' }));
    expect(result.current.isOpen).toBe(true);
  });

  test('handleKeyDown is a no-op when disabled', () => {
    const onSelect = jest.fn();
    const { result } = renderHook(() =>
      useSearch({ items, onSelect, disabled: true })
    );

    const preventDefault = jest.fn();
    act(() =>
      result.current.handleKeyDown({ key: 'ArrowDown', preventDefault })
    );

    expect(preventDefault).not.toHaveBeenCalled();
    expect(result.current.isOpen).toBe(false);
    expect(result.current.highlightedIndex).toBe(-1);
  });

  test('handleClear clears the input, focuses, and reopens the dropdown', () => {
    const onInputChange = jest.fn();
    const { result } = renderHook(() => useSearch({ items, onInputChange }));

    const focus = jest.fn();
    result.current.inputRef.current = { focus };

    const stopPropagation = jest.fn();
    act(() => result.current.handleClear({ stopPropagation }));

    expect(stopPropagation).toHaveBeenCalled();
    expect(onInputChange).toHaveBeenCalledWith(null, '');
    expect(focus).toHaveBeenCalled();
    expect(result.current.isOpen).toBe(true);
  });

  test('handleBlur closes the dropdown after the delay when focus left the dropdown', () => {
    jest.useFakeTimers({ doNotFake: ['performance'] });
    try {
      const { result } = renderHook(() => useSearch({ items }));
      act(() => result.current.handleFocus());
      expect(result.current.isOpen).toBe(true);

      // Simulate a dropdown element that does not contain the focused element.
      result.current.dropdownRef.current = document.createElement('div');

      act(() => result.current.handleBlur());
      // Nothing happens before the timeout elapses.
      expect(result.current.isOpen).toBe(true);

      act(() => jest.advanceTimersByTime(150));
      expect(result.current.isOpen).toBe(false);
    } finally {
      jest.useRealTimers();
    }
  });

  test('handleBlur keeps the dropdown open when focus is still inside it', () => {
    jest.useFakeTimers({ doNotFake: ['performance'] });
    try {
      const { result } = renderHook(() => useSearch({ items }));
      act(() => result.current.handleFocus());

      // Dropdown contains the active element -> stays open.
      const dropdown = document.createElement('div');
      const inner = document.createElement('button');
      dropdown.appendChild(inner);
      document.body.appendChild(dropdown);
      inner.focus();
      result.current.dropdownRef.current = dropdown;

      act(() => result.current.handleBlur());
      act(() => jest.advanceTimersByTime(150));
      expect(result.current.isOpen).toBe(true);

      document.body.removeChild(dropdown);
    } finally {
      jest.useRealTimers();
    }
  });

  test('a mousedown outside the input and dropdown closes it', () => {
    const { result } = renderHook(() => useSearch({ items }));
    act(() => result.current.handleFocus());
    expect(result.current.isOpen).toBe(true);

    const input = document.createElement('input');
    const dropdown = document.createElement('div');
    const outside = document.createElement('div');
    document.body.appendChild(input);
    document.body.appendChild(dropdown);
    document.body.appendChild(outside);
    result.current.inputRef.current = input;
    result.current.dropdownRef.current = dropdown;

    act(() => {
      outside.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });
    expect(result.current.isOpen).toBe(false);

    document.body.removeChild(input);
    document.body.removeChild(dropdown);
    document.body.removeChild(outside);
  });

  test('a mousedown inside the input does not close the dropdown', () => {
    const { result } = renderHook(() => useSearch({ items }));
    act(() => result.current.handleFocus());

    const input = document.createElement('input');
    const dropdown = document.createElement('div');
    document.body.appendChild(input);
    document.body.appendChild(dropdown);
    result.current.inputRef.current = input;
    result.current.dropdownRef.current = dropdown;

    act(() => {
      input.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });
    expect(result.current.isOpen).toBe(true);

    document.body.removeChild(input);
    document.body.removeChild(dropdown);
  });

  test('rapid input changes clear the previously scheduled debounce', async () => {
    const { result, rerender } = renderHook(
      ({ value }) => useSearch({ items, inputValue: value }),
      { initialProps: { value: 'light' } }
    );

    // Re-render several times quickly so each effect run clears the pending timer.
    rerender({ value: 'lightn' });
    rerender({ value: 'lightni' });
    rerender({ value: 'lightning' });

    await waitFor(() => expect(result.current.filteredItems.length).toBe(2));
    expect(result.current.filteredItems.map((i) => i.label)).toContain(
      'Lightning Strike'
    );
  });
});
