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

  test('handleInputChange forwards the value and opens the dropdown for non-empty input', () => {
    const onInputChange = jest.fn();
    const { result } = renderHook(() => useSearch({ items, onInputChange }));

    const event = { target: { value: 'lightning' } };
    act(() => result.current.handleInputChange(event));

    expect(onInputChange).toHaveBeenCalledWith(event, 'lightning');
    expect(result.current.isOpen).toBe(true);
  });

  test('handleInputChange keeps the dropdown closed when the value is empty', () => {
    const onInputChange = jest.fn();
    const { result } = renderHook(() => useSearch({ items, onInputChange }));

    const event = { target: { value: '' } };
    act(() => result.current.handleInputChange(event));

    expect(onInputChange).toHaveBeenCalledWith(event, '');
    expect(result.current.isOpen).toBe(false);
  });

  test('keepOpenOnSelect leaves the dropdown open after selecting', () => {
    const onSelect = jest.fn();
    const { result } = renderHook(() =>
      useSearch({ items, onSelect, keepOpenOnSelect: true })
    );

    act(() => result.current.handleSelect(items[0]));

    expect(onSelect).toHaveBeenCalledWith(items[0]);
    expect(result.current.isOpen).toBe(true);
    expect(result.current.highlightedIndex).toBe(-1);
  });

  test('ArrowUp moves the highlight up but never below -1', async () => {
    const { result } = renderHook(() =>
      useSearch({ items, inputValue: 'lightning' })
    );
    await waitFor(() => expect(result.current.filteredItems.length).toBe(2));

    const preventDefault = jest.fn();
    act(() => result.current.handleKeyDown({ key: 'ArrowDown', preventDefault }));
    act(() => result.current.handleKeyDown({ key: 'ArrowDown', preventDefault }));
    expect(result.current.highlightedIndex).toBe(1);

    act(() => result.current.handleKeyDown({ key: 'ArrowUp', preventDefault }));
    expect(preventDefault).toHaveBeenCalled();
    expect(result.current.highlightedIndex).toBe(0);

    act(() => result.current.handleKeyDown({ key: 'ArrowUp', preventDefault }));
    act(() => result.current.handleKeyDown({ key: 'ArrowUp', preventDefault }));
    expect(result.current.highlightedIndex).toBe(-1);
  });

  test('Enter selects the highlighted item when one is highlighted', async () => {
    const onSelect = jest.fn();
    const { result } = renderHook(() =>
      useSearch({ items, onSelect, inputValue: 'lightning' })
    );
    await waitFor(() => expect(result.current.filteredItems.length).toBe(2));

    act(() =>
      result.current.handleKeyDown({ key: 'ArrowDown', preventDefault: jest.fn() })
    );
    expect(result.current.highlightedIndex).toBe(0);

    const highlighted = result.current.filteredItems[0];
    act(() =>
      result.current.handleKeyDown({ key: 'Enter', preventDefault: jest.fn() })
    );
    expect(onSelect).toHaveBeenCalledWith(highlighted);
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
    const { result } = renderHook(() => useSearch({ items, disabled: true }));
    const preventDefault = jest.fn();

    act(() => result.current.handleKeyDown({ key: 'ArrowDown', preventDefault }));

    expect(preventDefault).not.toHaveBeenCalled();
    expect(result.current.isOpen).toBe(false);
    expect(result.current.highlightedIndex).toBe(-1);
  });

  test('handleClear resets the input, refocuses and reopens the dropdown', () => {
    const onInputChange = jest.fn();
    const { result } = renderHook(() => useSearch({ items, onInputChange }));

    const stopPropagation = jest.fn();
    act(() => result.current.handleClear({ stopPropagation }));

    expect(stopPropagation).toHaveBeenCalled();
    expect(onInputChange).toHaveBeenCalledWith(null, '');
    expect(result.current.isOpen).toBe(true);
  });

  test('handleBlur closes the dropdown after the delay when focus has left it', () => {
    jest.useFakeTimers({ doNotFake: ['performance'] });
    try {
      const { result } = renderHook(() => useSearch({ items }));
      act(() => result.current.handleFocus());
      expect(result.current.isOpen).toBe(true);

      // A detached dropdown element cannot contain the active element,
      // so the delayed blur handler should close the dropdown.
      result.current.dropdownRef.current = document.createElement('div');

      act(() => {
        result.current.handleBlur();
        jest.advanceTimersByTime(150);
      });

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

      const dropdownEl = document.createElement('div');
      const button = document.createElement('button');
      dropdownEl.appendChild(button);
      document.body.appendChild(dropdownEl);
      result.current.dropdownRef.current = dropdownEl;
      button.focus();

      act(() => {
        result.current.handleBlur();
        jest.advanceTimersByTime(150);
      });

      expect(result.current.isOpen).toBe(true);
      document.body.removeChild(dropdownEl);
    } finally {
      jest.useRealTimers();
    }
  });

  test('a mousedown outside the input and dropdown closes the dropdown', () => {
    const { result } = renderHook(() => useSearch({ items }));

    const inputEl = document.createElement('input');
    const dropdownEl = document.createElement('div');
    const outsideEl = document.createElement('div');
    document.body.append(inputEl, dropdownEl, outsideEl);
    result.current.inputRef.current = inputEl;
    result.current.dropdownRef.current = dropdownEl;

    act(() => result.current.handleFocus());
    expect(result.current.isOpen).toBe(true);

    act(() => {
      outsideEl.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });
    expect(result.current.isOpen).toBe(false);

    inputEl.remove();
    dropdownEl.remove();
    outsideEl.remove();
  });

  test('a mousedown inside the dropdown keeps it open', () => {
    const { result } = renderHook(() => useSearch({ items }));

    const inputEl = document.createElement('input');
    const dropdownEl = document.createElement('div');
    const innerEl = document.createElement('div');
    dropdownEl.appendChild(innerEl);
    document.body.append(inputEl, dropdownEl);
    result.current.inputRef.current = inputEl;
    result.current.dropdownRef.current = dropdownEl;

    act(() => result.current.handleFocus());
    expect(result.current.isOpen).toBe(true);

    act(() => {
      innerEl.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });
    expect(result.current.isOpen).toBe(true);

    inputEl.remove();
    dropdownEl.remove();
  });

  test('re-filters and clears the pending debounce when the input changes rapidly', () => {
    jest.useFakeTimers({ doNotFake: ['performance'] });
    try {
      const { result, rerender } = renderHook(
        ({ inputValue }) => useSearch({ items, inputValue }),
        { initialProps: { inputValue: 'light' } }
      );

      // Rerender before the 50ms debounce fires so the effect clears the
      // previously scheduled timeout instead of running it.
      rerender({ inputValue: 'lightning' });
      act(() => jest.advanceTimersByTime(50));

      expect(result.current.filteredItems.length).toBe(2);
    } finally {
      jest.useRealTimers();
    }
  });
});
